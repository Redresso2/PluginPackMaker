const express = require('express');
const axios = require('axios');
const JSZip = require('jszip');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// 1. Search Modrinth API
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        const response = await axios.get(`https://api.modrinth.com/v2/search?query=${query}&facets=[["categories:spigot","categories:paper"]]`);
        res.json(response.data.hits);
    } catch (err) {
        res.status(500).json({ error: "Failed to search Modrinth" });
    }
});

// 2. Build the ZIP
app.post('/api/build', async (req, res) => {
    const { plugins } = req.body;
    const zip = new JSZip();

    try {
        for (const p of plugins) {
            if (p.url) { // If it's a web URL
                const resp = await axios.get(p.url, { responseType: 'arraybuffer' });
                zip.file(`${p.name}.jar`, resp.data);
            } 
            // Note: In a full app, local files would be sent via FormData, 
            // but for this simple version, focus on the API downloads!
        }

        const content = await zip.generateAsync({ type: 'nodebuffer' });
        res.set('Content-Type', 'application/zip');
        res.send(content);
    } catch (err) {
        res.status(500).send("Error building pack");
    }
});

app.listen(3000, () => console.log('Site live at http://localhost:3000'));