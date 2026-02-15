// index.js - Core Logic with Cloud Database (JSONBin.io)

// --- Configuration ---
const PARTICIPANTS_FILE = 'program_wise_participant_list.json';
const BIN_ID = '699187e443b1c97be9806216'; // Your Bin ID
const API_KEY = '$2a$10$Vl5PPbQBFHJ0KBq1U2YNi.BHa9f3RgtyCW0ehBtDX2KCd/fbNjR/S'; // Your Master Key

// --- Global State ---
window.allData = {};       // Participants Data
window.scheduleData = [];  // Schedule Data
window.facultyScores = {}; // Leaderboard Scores
window.publishedResults = []; // Results Data

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    injectAppStyles(); // Mobile Styles
    renderNavigation();
    
    // 1. Load Data
    await loadData();
    
    // 2. Calculate Scores
    calculateFacultyScores();

    // 3. Dispatch Ready Event (for Admin page)
    document.dispatchEvent(new Event('artsFestDataReady'));

    // 4. Initialize Specific Page
    const page = document.body.getAttribute('data-page');
    if (page === 'home') initHome();
    if (page === 'schedule') initSchedule();
    if (page === 'leaderboard') initLeaderboard();
    if (page === 'result') initResults();
});

// --- Data Loading (Hybrid: Local + Cloud) ---
async function loadData() {
    console.log("🔄 Starting data load...");
    
    try {
        // A. Fetch Participants (Local File)
        try {
            console.log("📂 Loading participants file:", PARTICIPANTS_FILE);
            const pResponse = await fetch(PARTICIPANTS_FILE);
            window.allData = await pResponse.json();
            console.log("✅ Loaded participants:", Object.keys(window.allData).length, "programs");
        } catch (e) {
            console.error("❌ Error loading participants file:", e);
            window.allData = {}; 
        }

        // B. Fetch Results from JSONBin (Cloud Database)
        try {
            const apiUrl = `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`;
            console.log("🌐 Fetching results from:", apiUrl);
            
            const rResponse = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'X-Master-Key': API_KEY
                }
            });
            
            console.log("📡 Response status:", rResponse.status, rResponse.ok ? "OK" : "ERROR");
            
            if (rResponse.ok) {
                const data = await rResponse.json();
                console.log("📦 Raw response:", data);
                
                // JSONBin returns {record: actualData} format
                window.publishedResults = data.record || [];
                console.log("✅ Successfully loaded", window.publishedResults.length, "published results");
                console.log("📋 Results data:", window.publishedResults);
            } else {
                const errorData = await rResponse.json();
                console.error("❌ API Error:", rResponse.status, errorData);
                window.publishedResults = [];
            }
        } catch (e) {
            console.error("❌ Network error fetching results:", e);
            window.publishedResults = [];
        }

        generateRandomSchedule();
        console.log("✅ Data loading complete");

    } catch (error) {
        console.error("❌ Critical Error loading data:", error);
    }
}

// --- Score Calculation ---
function calculateFacultyScores() {
    window.facultyScores = {};
    
    console.log("Calculating scores from", window.publishedResults.length, "results");
    
    // Step 1: Participation Points (1 pt per entry)
    if (window.allData) {
        Object.values(window.allData).flat().forEach(p => {
            const fac = p.FACULTY ? p.FACULTY.toUpperCase() : "UNKNOWN";
            if (!window.facultyScores[fac]) window.facultyScores[fac] = 0;
            window.facultyScores[fac] += 1;
        });
    }

    // Step 2: Add Points from Results
    window.publishedResults.forEach(r => {
        if (r.winner && r.winner.FACULTY) {
            const fac = r.winner.FACULTY.toUpperCase();
            if (!window.facultyScores[fac]) window.facultyScores[fac] = 0;
            
            // Use stored points or fallback logic
            const points = r.points ? parseInt(r.points) : (r.position === '1' ? 5 : (r.position === '2' ? 3 : 1));
            window.facultyScores[fac] += points;
            console.log(`Added ${points} points to ${fac} for ${r.program}`);
        }
    });
    
    console.log("Final scores:", window.facultyScores);
}

// --- Other Logic (Schedule, Nav, UI) ---

function generateRandomSchedule() {
    const programs = Object.keys(window.allData);
    const days = [1, 2, 3];
    window.scheduleData = programs.map(program => {
        // Deterministic Hash for consistent schedule
        const hash = program.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const day = days[hash % 3]; 
        const hour = 9 + (hash % 8);
        return {
            program: program,
            day: day,
            time: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`,
            venue: `Stage ${(hash % 4) + 1}`,
            timestamp: new Date(`2026-02-${19 + day}T${hour.toString().padStart(2,'0')}:00:00`)
        };
    }).sort((a, b) => a.timestamp - b.timestamp);
}

function injectAppStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        * { -webkit-tap-highlight-color: transparent; }
        html { scroll-behavior: smooth; }
        body { background-color: #f0f2f5; font-family: system-ui, -apple-system, sans-serif; }
        .pb-safe { padding-bottom: 90px !important; } 
        .app-bottom-nav {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-top: 1px solid rgba(0,0,0,0.05);
            padding: 8px 0 20px 0;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.03);
            z-index: 1050;
        }
        .nav-app-link { border: none; background: none; color: #5f6368; display: flex; flex-direction: column; align-items: center; width: 100%; text-decoration: none; }
        .nav-icon-container { border-radius: 20px; padding: 4px 20px; margin-bottom: 2px; transition: 0.2s; }
        .nav-app-link.active .nav-icon-container { background-color: #c2e7ff; color: #001d35; }
        .nav-app-link.active { color: #001d35; font-weight: 600; }
        .nav-label { font-size: 11px; letter-spacing: 0.3px; }
    `;
    document.head.appendChild(style);
}

function renderNavigation() {
    const activePage = document.body.getAttribute('data-page');
    const navItems = [
        { name: 'Home', icon: 'home', link: 'index.html', id: 'home' },
        { name: 'Schedule', icon: 'calendar_month', link: 'schedule.html', id: 'schedule' },
        { name: 'Results', icon: 'emoji_events', link: 'result.html', id: 'result' },
        { name: 'Leaderboard', icon: 'leaderboard', link: 'leaderboard.html', id: 'leaderboard' },
    ];

    const bottomNav = document.createElement('nav');
    bottomNav.className = "app-bottom-nav fixed-bottom d-md-none";
    let mobileLinks = '<div class="d-flex justify-content-around align-items-center w-100">';
    navItems.forEach(item => {
        const isActive = activePage === item.id;
        const iconFill = isActive ? "'FILL' 1" : "'FILL' 0";
        mobileLinks += `
            <a href="${item.link}" class="nav-app-link ${isActive ? 'active' : ''}">
                <div class="nav-icon-container">
                    <span class="material-symbols-outlined" style="font-variation-settings: ${iconFill}">${item.icon}</span>
                </div>
                <span class="nav-label">${item.name}</span>
            </a>`;
    });
    bottomNav.innerHTML = mobileLinks + '</div>';
    document.body.appendChild(bottomNav);

    const topNav = document.getElementById('desktop-nav-items');
    if(topNav) {
        let links = '';
        navItems.forEach(item => {
            const isActive = activePage === item.id;
            links += `<li class="nav-item"><a href="${item.link}" class="nav-link ${isActive ? 'active fw-bold text-primary border-bottom border-primary border-2' : 'text-dark'} px-3">${item.name}</a></li>`;
        });
        topNav.innerHTML = links;
    }
}

// --- Page Renderers ---

function initHome() {
    const sorted = Object.entries(window.facultyScores).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
        document.getElementById('top-faculty-name').innerText = sorted[0][0];
        document.getElementById('top-faculty-score').innerText = `${sorted[0][1]} Pts`;
    }
    const now = new Date("2026-02-20T09:00:00"); 
    const nextEvent = window.scheduleData.find(s => s.timestamp > now);
    if (nextEvent) {
        document.getElementById('next-program-title').innerText = nextEvent.program;
        document.getElementById('next-program-time').innerText = `${nextEvent.time}`;
    }
}

function initSchedule() {
    const tabs = document.querySelectorAll('.nav-link[data-day]');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            tabs.forEach(t => t.classList.remove('active', 'bg-primary', 'text-white'));
            tab.classList.add('active', 'bg-primary', 'text-white');
            renderScheduleList(parseInt(tab.dataset.day));
        });
    });
    renderScheduleList(1);
}

function renderScheduleList(day) {
    const container = document.getElementById('schedule-container');
    const events = window.scheduleData.filter(s => s.day === day);
    container.innerHTML = '';
    if(events.length === 0) { container.innerHTML = '<div class="text-center mt-5 text-muted">No events.</div>'; return; }

    events.forEach(event => {
        const participants = window.allData[event.program] || [];
        const result = window.publishedResults.find(r => r.program === event.program);
        const badge = result ? '<span class="badge bg-success mb-2 rounded-pill px-3">Result Published</span>' : '';

        const card = document.createElement('div');
        card.className = "card border-0 shadow-sm mb-3 rounded-4";
        card.innerHTML = `
            <div class="card-body p-3">
                ${badge}
                <div class="d-flex justify-content-between align-items-center">
                    <div class="overflow-hidden me-2">
                        <h6 class="fw-bold mb-1 text-dark text-truncate">${event.program}</h6>
                        <p class="text-muted small mb-0">${event.time} • ${event.venue}</p>
                    </div>
                    <button class="btn btn-light rounded-circle toggle-btn text-primary flex-shrink-0" style="width:40px;height:40px;"><span class="material-symbols-outlined">expand_more</span></button>
                </div>
                <div class="details collapse mt-3 pt-3 border-top">
                    <h6 class="text-muted small fw-bold">Participants (${participants.length})</h6>
                    <div class="vstack gap-2">
                        ${participants.map(p => `
                            <div class="d-flex align-items-center bg-light p-2 rounded-3">
                                <div class="rounded-circle bg-white text-primary fw-bold border d-flex align-items-center justify-content-center me-3" style="width: 32px; height: 32px;">${p.NAME.charAt(0)}</div>
                                <div class="small fw-bold text-truncate">${p.NAME}</div>
                            </div>`).join('')}
                    </div>
                </div>
            </div>`;
        
        const btn = card.querySelector('.toggle-btn');
        const details = card.querySelector('.details');
        const bsCollapse = new bootstrap.Collapse(details, { toggle: false });
        btn.addEventListener('click', () => {
            bsCollapse.toggle();
            const icon = btn.querySelector('span');
            setTimeout(() => {
                icon.innerText = details.classList.contains('show') ? 'expand_less' : 'expand_more';
            }, 200);
        });
        container.appendChild(card);
    });
}

function initLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    
    // Sort High to Low
    const sorted = Object.entries(window.facultyScores).sort((a, b) => b[1] - a[1]);
    
    if (sorted.length === 0) {
        list.innerHTML = '<div class="text-center text-muted py-5">No points data available yet.</div>';
        return;
    }

    // Max score for progress bar scaling
    const maxScore = sorted[0][1] > 0 ? sorted[0][1] : 1;

    list.innerHTML = sorted.map(([name, score], index) => {
        let color = index === 0 ? 'bg-danger-subtle text-danger-emphasis' : (index === 1 ? 'bg-primary-subtle text-primary-emphasis' : (index === 2 ? 'bg-warning-subtle text-warning-emphasis' : 'bg-white border'));
        let rankBadge = index === 0 ? 'bg-danger text-white' : (index === 1 ? 'bg-primary text-white' : (index === 2 ? 'bg-warning text-dark' : 'bg-light text-dark'));
        let rankLabel = index < 3 ? `#${index + 1}` : index + 1;

        return `
        <div class="card border-0 shadow-sm mb-3 rounded-4 overflow-hidden ${color}">
            <div class="card-body d-flex align-items-center p-3">
                <div class="rounded-circle ${rankBadge} d-flex align-items-center justify-content-center me-3 fw-bold shadow-sm" style="width: 48px; height: 48px; font-size: 1.2rem;">
                    ${rankLabel}
                </div>
                <div class="flex-grow-1">
                    <h5 class="fw-bold mb-0">${name}</h5>
                    <div class="progress mt-2 rounded-pill" style="height:6px; background-color: rgba(0,0,0,0.1);">
                        <div class="progress-bar rounded-pill" style="width:${(score/maxScore)*100}%; background-color: currentColor;"></div>
                    </div>
                </div>
                <div class="text-end ms-3">
                    <div class="fs-4 fw-bold">${score}</div>
                    <div class="small opacity-75 fw-bold text-uppercase" style="font-size:0.7rem">Points</div>
                </div>
            </div>
        </div>`;
    }).join('');
}

function initResults() {
    const container = document.getElementById('results-container');
    if (window.publishedResults.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-5"><span class="material-symbols-outlined display-1 opacity-25">emoji_events</span><p>No results published yet.</p></div>';
        return;
    }
    const reversedResults = [...window.publishedResults].reverse();
    container.innerHTML = reversedResults.map(r => {
        let badge = r.position === '1' ? '🥇 1st' : (r.position === '2' ? '🥈 2nd' : '🥉 3rd');
        let borderClass = r.position === '1' ? 'border-warning' : (r.position === '2' ? 'border-secondary' : 'border-danger');
        
        return `
        <div class="col-md-6 mb-4">
            <div class="card border-0 shadow-sm rounded-4 h-100">
                <div class="card-header bg-white border-0 pt-4 px-4 pb-0 d-flex justify-content-between">
                    <span class="badge bg-primary-subtle text-primary">OFFICIAL</span>
                    <small class="text-muted">${new Date(r.timestamp).toLocaleDateString()}</small>
                </div>
                <div class="card-body px-4 pb-4 pt-2">
                    <h5 class="fw-bold mb-3">${r.program}</h5>
                    <div class="d-flex align-items-center bg-light p-3 rounded-4 border ${borderClass} border-2">
                        <div class="display-6 me-3">${badge.split(' ')[0]}</div>
                        <div class="overflow-hidden">
                            <div class="small text-uppercase fw-bold text-muted" style="font-size:10px;">${badge.split(' ')[1]} Place</div>
                            <h4 class="fw-bold mb-0 text-dark text-truncate">${r.winner.NAME}</h4>
                            <div class="text-primary fw-medium text-truncate">${r.winner.FACULTY}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}