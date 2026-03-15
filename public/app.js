let pack = [];

// --- 1. SEARCH LOGIC ---
async function searchAll() {
    const q = document.getElementById('query').value;
    const resultsDiv = document.getElementById('results');
    
    if (!q) return alert("Type something to search!");
    
    resultsDiv.innerHTML = "<div class='loading'>Searching the multiverse...</div>";

    try {
        // Fetch from Modrinth (Best for Spigot/Paper)
        const modrinthRes = await fetch(`https://api.modrinth.com/v2/search?query=${q}&facets=[["categories:spigot","categories:paper"]]`);
        const modrinth = await modrinthRes.json();
        
        // Fetch from Hangar (PaperMC official)
        const hangarRes = await fetch(`https://hangar.papermc.io/api/v1/projects?q=${q}`);
        const hangar = await hangarRes.json();

        resultsDiv.innerHTML = ""; // Clear loading

        // Render Modrinth Results
        modrinth.hits.forEach(item => {
            renderCard({
                name: item.title,
                desc: item.description,
                img: item.icon_url,
                source: 'Modrinth',
                id: item.project_id,
                downloadUrl: `https://cdn.modrinth.com/data/${item.project_id}/versions/latest.jar` // Simplified for demo
            });
        });

        // Render Hangar Results
        hangar.result.forEach(item => {
            renderCard({
                name: item.name,
                desc: item.description,
                img: '', // Hangar doesn't always provide easy thumbs in search
                source: 'Hangar',
                id: item.namespace.slug,
                downloadUrl: `https://hangar.papermc.io/api/v1/projects/${item.namespace.slug}/latest/download`
            });
        });

    } catch (err) {
        resultsDiv.innerHTML = "<p style='color:red'>Search failed. Check your internet.</p>";
        console.error(err);
    }
}

// --- 2. UI RENDERING ---
function renderCard(data) {
    const card = document.createElement('div');
    card.className = 'card';
    const fallbackImg = 'https://cdn-icons-png.flaticon.com/512/6009/6009001.png'; // Minecraft block icon
    
    card.innerHTML = `
        <img src="${data.img || fallbackImg}" alt="icon">
        <div class="card-info">
            <h4>${data.name}</h4>
            <span class="badge ${data.source.toLowerCase()}">${data.source}</span>
            <p>${data.desc ? data.desc.substring(0, 60) + '...' : 'No description available.'}</p>
            <button onclick="addToPack('${data.name}', '${data.downloadUrl}')">Add to Pack</button>
        </div>
    `;
    document.getElementById('results').appendChild(card);
}

// --- 3. PACK MANAGEMENT ---
function addToPack(name, url) {
    // Prevent duplicates
    if (pack.find(p => p.name === name)) return alert("Already in your pack!");
    
    pack.push({ name, url });
    updateSidebar();
}

function removeFromPack(index) {
    pack.splice(index, 1);
    updateSidebar();
}

function updateSidebar() {
    const list = document.getElementById('pack-list');
    list.innerHTML = pack.map((item, index) => `
        <div class="pack-item">
            <span>📦 ${item.name}</span>
            <button class="remove-btn" onclick="removeFromPack(${index})">×</button>
        </div>
    `).join('');
}

// --- 4. DRAG AND DROP ---
const dropZone = document.getElementById('drop-zone');

// Highlight dropzone when dragging over
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.background = "rgba(0, 255, 136, 0.1)";
    dropZone.style.borderColor = "#00ff88";
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.background = "transparent";
    dropZone.style.borderColor = "#444";
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.background = "transparent";
    dropZone.style.borderColor = "#444";
    
    const files = e.dataTransfer.files;
    for (let file of files) {
        if (file.name.endsWith('.jar')) {
            // We store the file object itself for local uploads
            pack.push({ name: file.name, file: file, source: 'Local' });
            updateSidebar();
        } else {
            alert("Only .jar files are allowed!");
        }
    }
});

// --- 5. THE FINAL BUILD ---
async function downloadZIP() {
    if (pack.length === 0) return alert("Your pack is empty!");

    const btn = document.querySelector('.download-btn');
    btn.innerText = "ZIPPING...";
    btn.disabled = true;

    try {
        const response = await fetch('/api/build', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plugins: pack })
        });

        if (!response.ok) throw new Error("Build failed");

        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `PluginPack_${document.getElementById('version').value}.zip`;
        link.click();
    } catch (err) {
        alert("Error creating ZIP. Make sure your server.js is running!");
    } finally {
        btn.innerText = "BUILD ZIP PACK";
        btn.disabled = false;
    }
}