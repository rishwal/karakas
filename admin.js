// admin.js - Manual Entry Version (Cloud + Manual Typing)

// --- Configuration ---
const BIN_ID = '699187e443b1c97be9806216'; 
const API_KEY = '$2a$10$Vl5PPbQBFHJ0KBq1U2YNi.BHa9f3RgtyCW0ehBtDX2KCd/fbNjR/S'; 

// Run Immediately
if (document.body.getAttribute('data-page') === 'admin') {
    initAdmin();
}

function initAdmin() {
    console.log("Admin Panel Initialized"); 

    const loginOverlay = document.getElementById('login-overlay');
    const adminContent = document.getElementById('admin-content');
    const passwordInput = document.getElementById('admin-pass');
    const loginBtn = document.getElementById('login-btn');

    if (!loginBtn) return;

    // Function to load existing data from server
    async function loadExistingData() {
        try {
            console.log("Loading existing data from server...");
            const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': API_KEY
                }
            });

            if (response.ok) {
                const data = await response.json();
                window.publishedResults = data.record || [];
                console.log("✅ Loaded", window.publishedResults.length, "existing results");
                renderAdminResultsList();
            } else {
                console.warn("Could not load existing data, starting fresh");
                window.publishedResults = [];
            }
        } catch (error) {
            console.error("Error loading data:", error);
            window.publishedResults = [];
        }
    }

    // 1. Login Logic
    loginBtn.addEventListener('click', async () => {
        if (passwordInput.value === '8129326958') {
            loginOverlay.classList.add('d-none');
            adminContent.classList.remove('d-none');
            
            // Load existing data from server FIRST
            await loadExistingData();
            
            // Then load faculty dropdown
            loadFacultyDropdown();
        } else {
            alert("Incorrect Password!");
            passwordInput.value = '';
        }
    });

    // 2. Populate Faculty Dropdown
    function loadFacultyDropdown() {
        const facultySelect = document.getElementById('faculty-select');
        const staticFaculties = [
            "ARTS,APPLIED SCIENCE, MUSIC", 
            "BSCHOOL( IMK,LAW,COMMERCE)", 
            "ORIENTAL, EDUCATION", 
            "SCIENCE", 
            "SOCIAL SCIENCE"
        ];
        
        facultySelect.innerHTML = '<option value="">Select Faculty...</option>' + 
            staticFaculties.map(f => `<option value="${f}">${f}</option>`).join('');
    }

    // 3. Points Calculation Logic
    function calculatePoints() {
        const typeEl = document.querySelector('input[name="eventType"]:checked');
        const posEl = document.querySelector('input[name="position"]:checked');
        
        if (!posEl || !typeEl) return 0;
        const type = typeEl.value;
        const pos = posEl.value;
        
        if (type === 'individual') return (pos === '1' ? 5 : (pos === '2' ? 3 : 1));
        if (type === 'group') return (pos === '1' ? 10 : (pos === '2' ? 5 : 3));
        return 0;
    }

    document.querySelectorAll('input[name="eventType"], input[name="position"]').forEach(el => {
        el.addEventListener('change', () => {
            document.getElementById('points-preview').innerText = `Points: ${calculatePoints()}`;
        });
    });

    // 4. Submit Result
    const submitBtn = document.getElementById('submit-result');
    if(submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const program = document.getElementById('program-name').value.trim();
            const name = document.getElementById('winner-name').value.trim();
            const faculty = document.getElementById('faculty-select').value;
            const position = document.querySelector('input[name="position"]:checked')?.value;
            const points = calculatePoints();

            if (!program || !name || !faculty || !position) {
                alert("⚠️ Please fill all fields!");
                return;
            }

            const resultObj = {
                program: program,
                winner: { NAME: name, FACULTY: faculty },
                position: position,
                points: points,
                timestamp: new Date().toISOString()
            };

            const originalText = submitBtn.innerText;
            submitBtn.innerText = "Saving...";
            submitBtn.disabled = true;

            try {
                if(!window.publishedResults) {
                    console.warn("publishedResults was undefined, initializing...");
                    window.publishedResults = [];
                }
                
                window.publishedResults.push(resultObj);
                
                console.log("Attempting to save", window.publishedResults.length, "results to server");
                
                const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': API_KEY
                    },
                    body: JSON.stringify(window.publishedResults)
                });

                const responseData = await response.json();
                console.log("Server response:", responseData);

                if (response.ok) {
                    alert(`✅ Success! Result published for ${program}`);
                    renderAdminResultsList();
                    // Clear fields
                    document.getElementById('winner-name').value = ''; 
                    document.getElementById('program-name').value = '';
                    document.getElementById('faculty-select').value = '';
                    document.querySelectorAll('input[name="position"]').forEach(r => r.checked = false);
                    document.getElementById('points-preview').innerText = 'Points: 0';
                } else {
                    throw new Error(`Server Error: ${response.status} - ${responseData.message || 'Unknown error'}`);
                }
            } catch (error) {
                console.error("Save error:", error);
                alert("❌ Failed to save. Error: " + error.message);
                // Rollback
                window.publishedResults.pop();
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // 5. Render History List
    function renderAdminResultsList() {
        const list = document.getElementById('admin-results-list');
        if(!list) return;

        const results = window.publishedResults || [];
        const displayList = [...results].reverse();
        
        if (displayList.length === 0) {
            list.innerHTML = '<li class="list-group-item text-muted text-center">No results published yet</li>';
            return;
        }

        list.innerHTML = displayList.map((r, i) => {
            const originalIndex = results.length - 1 - i;
            let badgeColor = r.position === '1' ? 'text-warning' : (r.position === '2' ? 'text-secondary' : 'text-danger');
            let medal = r.position === '1' ? '🥇' : (r.position === '2' ? '🥈' : '🥉');

            return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${r.program}</strong> <span class="badge bg-light text-dark border ms-1">${r.points} pts</span><br>
                    <small class="${badgeColor}">${medal} ${r.position === '1' ? '1st' : (r.position === '2' ? '2nd' : '3rd')}</small> 
                    <small class="text-muted"> - ${r.winner.NAME} (${r.winner.FACULTY})</small>
                </div>
                <button class="btn btn-sm text-danger delete-btn" data-index="${originalIndex}">
                    <span class="material-symbols-outlined fs-6">delete</span>
                </button>
            </li>`;
        }).join('');

        // Add event listeners to all delete buttons
        list.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const index = parseInt(this.getAttribute('data-index'));
                await deleteResult(index);
            });
        });
    }

    // 6. Delete Result Function
    async function deleteResult(index) {
        if(!confirm("🗑️ Delete this result permanently?")) {
            return;
        }

        const temp = [...window.publishedResults];
        const deletedItem = window.publishedResults[index];
        
        // Remove from array
        window.publishedResults.splice(index, 1);
        
        // Update UI immediately
        renderAdminResultsList();

        try {
            console.log("Deleting result at index:", index);
            console.log("Deleted item:", deletedItem.program);
            console.log("Remaining results:", window.publishedResults.length);
            
            const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json', 
                    'X-Master-Key': API_KEY 
                },
                body: JSON.stringify(window.publishedResults)
            });

            const responseData = await response.json();
            console.log("Delete response:", responseData);

            if (response.ok) {
                alert("✅ Deleted successfully!");
            } else {
                throw new Error(`Delete failed: ${response.status} - ${responseData.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert("❌ Error deleting: " + error.message + "\n\nRestoring data...");
            // Rollback
            window.publishedResults = temp;
            renderAdminResultsList();
        }
    }

    // 7. Download Backup
    const downloadBtn = document.getElementById('download-json');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const dataStr = JSON.stringify(window.publishedResults || [], null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `arts-fest-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            alert("✅ Backup downloaded!");
        });
    }
}