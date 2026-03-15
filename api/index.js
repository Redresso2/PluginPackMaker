const express = require('express');
const axios = require('axios');
const JSZip = require('jszip');
const app = express();

app.use(express.json());

// Search Endpoint
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    try {
        const [modrinth, hangar] = await Promise.all([
            axios.get(`https://api.modrinth.com/v2/search?query=${query}`),
            axios.get(`https://hangar.papermc.io/api/v1/projects?q=${query}`)
        ]);
        res.json({ modrinth: modrinth.data.hits, hangar: hangar.data.result });
    } catch (err) {
        res.status(500).json({ error: "Search failed" });
    }
});

// Build ZIP Endpoint
app.post('/api/build', async (req, res) => {
    const { plugins } = req.body;
    const zip = new JSZip();

    try {
        for (const p of plugins) {
            if (p.url) {
                const resp = await axios.get(p.url, { responseType: 'arraybuffer' });
                zip.file(`${p.name.replace(/\s+/g, '_')}.jar`, resp.data);
            }
        }

        const content = await zip.generateAsync({ type: 'nodebuffer' });
        
        // VERCEL LIMIT WARNING: 
        // Hobby plan has a 4.5MB response limit. 
        if (content.length > 4500000) {
            return res.status(413).send("Pack too large for Vercel (Max 4.5MB). Try a smaller selection.");
        }

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=plugin_pack.zip');
        res.send(content);
    } catch (err) {
        res.status(500).send("Error creating ZIP");
    }
});

module.exports = app; // Export for Vercel
