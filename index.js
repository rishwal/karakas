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
    console.log("🚀 Application starting...");
    
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
    console.log("📄 Current page:", page);
    
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
            if (!pResponse.ok) {
                throw new Error(`HTTP ${pResponse.status}: ${pResponse.statusText}`);
            }
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
                console.log("📦 Raw response structure:", {
                    hasRecord: !!data.record,
                    recordType: Array.isArray(data.record) ? 'array' : typeof data.record,
                    recordLength: Array.isArray(data.record) ? data.record.length : 'N/A'
                });
                
                // JSONBin returns {record: actualData} format
                window.publishedResults = Array.isArray(data.record) ? data.record : [];
                console.log("✅ Successfully loaded", window.publishedResults.length, "published results");
                
                if (window.publishedResults.length > 0) {
                    console.log("📋 Sample result:", window.publishedResults[0]);
                }
            } else {
                const errorText = await rResponse.text();
                console.error("❌ API Error:", rResponse.status, errorText);
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
    console.log("🔢 Starting score calculation...");
    
    // Initialize all faculties with 0 points
    window.facultyScores = {
        "ARTS,APPLIED SCIENCE, MUSIC": 0,
        "BSCHOOL( IMK,LAW,COMMERCE)": 0,
        "ORIENTAL, EDUCATION": 0,
        "SCIENCE": 0,
        "SOCIAL SCIENCE": 0
    };
    
    console.log("📊 Processing", window.publishedResults.length, "results");
    
    // Calculate points ONLY from published results (no participation points)
    if (window.publishedResults && window.publishedResults.length > 0) {
        window.publishedResults.forEach((r, index) => {
            if (r.winner && r.winner.FACULTY) {
                const fac = r.winner.FACULTY.toUpperCase();
                if (!window.facultyScores[fac]) window.facultyScores[fac] = 0;
                
                // Use stored points or fallback logic
                const points = r.points ? parseInt(r.points) : (r.position === '1' ? 5 : (r.position === '2' ? 3 : 1));
                window.facultyScores[fac] += points;
                console.log(`  [${index + 1}] Added ${points} points to ${fac} for ${r.program}`);
            } else {
                console.warn(`  [${index + 1}] Invalid result structure:`, r);
            }
        });
    } else {
        console.warn("⚠️ No published results to process");
    }
    
    console.log("🏆 Final faculty scores:", window.facultyScores);
    console.log("📊 Score breakdown:", Object.entries(window.facultyScores).map(([f, s]) => `${f}: ${s}`).join(', '));
}

// --- Other Logic (Schedule, Nav, UI) ---

function generateRandomSchedule() {
    const programs = Object.keys(window.allData);
    const days = [1, 2, 3,4]; // 4 days of events
    window.scheduleData = programs.map(program => {
        // Deterministic Hash for consistent schedule
        const hash = program.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const day = days[hash % 4]; 
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
        * { 
            -webkit-tap-highlight-color: transparent; 
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
        }
        html { scroll-behavior: smooth; }
        body { 
            background-color: #f0f2f5; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            overscroll-behavior: none;
        }
        .pb-safe { padding-bottom: 85px !important; } 
        
        /* Modern Mobile App Bottom Navigation */
        .app-bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: saturate(180%) blur(20px);
            -webkit-backdrop-filter: saturate(180%) blur(20px);
            border-top: 0.5px solid rgba(0, 0, 0, 0.08);
            padding: 6px 0 max(env(safe-area-inset-bottom), 8px);
            box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.04);
            z-index: 1050;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .nav-container {
            display: flex;
            justify-content: space-around;
            align-items: flex-end;
            padding: 0 8px;
            max-width: 500px;
            margin: 0 auto;
        }
        
        /* Individual Nav Item */
        .nav-app-link {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            padding: 6px 4px 2px;
            text-decoration: none;
            color: #8e8e93;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            border: none;
            background: none;
            min-width: 0;
        }
        
        /* Icon Styling */
        .nav-icon-container {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            margin-bottom: 4px;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .nav-icon-container .material-symbols-outlined {
            font-size: 26px;
            font-weight: 400;
            transition: all 0.2s ease;
        }
        
        /* Label Styling */
        .nav-label {
            font-size: 10px;
            font-weight: 500;
            letter-spacing: -0.1px;
            line-height: 1.2;
            transition: all 0.2s ease;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
        }
        
        /* Active State - iOS Style */
        .nav-app-link.active {
            color: #007AFF;
        }
        
        .nav-app-link.active .material-symbols-outlined {
            font-weight: 600;
            transform: scale(1.05);
        }
        
        .nav-app-link.active .nav-label {
            font-weight: 600;
        }
        
        /* Tap/Touch Feedback */
        .nav-app-link:active {
            transform: scale(0.95);
            opacity: 0.7;
        }
        
        /* Ripple effect container */
        .nav-app-link::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(0, 122, 255, 0.1);
            transform: translate(-50%, -50%);
            transition: width 0.4s, height 0.4s;
        }
        
        .nav-app-link:active::before {
            width: 48px;
            height: 48px;
        }
        
        /* Responsive adjustments */
        @media (max-width: 375px) {
            .nav-label {
                font-size: 9px;
            }
            .nav-icon-container .material-symbols-outlined {
                font-size: 24px;
            }
        }
        
        @media (min-width: 768px) {
            .app-bottom-nav {
                display: none;
            }
        }
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

    // Mobile Bottom Navigation
    const bottomNav = document.createElement('div');
    bottomNav.className = "d-md-none app-bottom-nav";
    
    let mobileLinks = '<div class="nav-container">';
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
    mobileLinks += '</div>';
    
    bottomNav.innerHTML = mobileLinks;
    document.body.appendChild(bottomNav);

    // Desktop Top Navigation
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
// Renders the schedule list for a given day, showing events and participants with collapsible details
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
    console.log("🏆 Initializing leaderboard...");
    const list = document.getElementById('leaderboard-list');
    
    if (!list) {
        console.error("❌ Leaderboard container not found!");
        return;
    }
    
    console.log("📊 Faculty scores:", window.facultyScores);
    console.log("📊 Number of faculties:", Object.keys(window.facultyScores).length);
    
    // Sort High to Low
    const sorted = Object.entries(window.facultyScores).sort((a, b) => b[1] - a[1]);
    
    console.log("📈 Sorted leaderboard:", sorted);
    
    if (sorted.length === 0) {
        console.warn("⚠️ No leaderboard data available");
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
    
    console.log("✅ Leaderboard rendered successfully");
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