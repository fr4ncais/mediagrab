const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/download', (req, res) => {
    const { url, type } = req.body;

    if (!url) return res.status(400).json({ error: 'Lien manquant' });

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-'));
    const outputTemplate = path.join(tmpDir, '%(title)s.%(ext)s');

    let cmd = '';

    if (type === '1') {
        cmd = `yt-dlp -x --audio-format mp3 --remote-components ejs:github -o "${outputTemplate}" "${url}"`;
    } else if (type === '2') {
        cmd = `yt-dlp -f "bestvideo[height<=1080][fps=60][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --remote-components ejs:github -o "${outputTemplate}" "${url}"`;
    } else if (type === '3') {
        const filename = 'image_' + Date.now() + '.png';
        const filepath = path.join(tmpDir, filename);

        exec(`curl -L -o "${filepath}" "${url}"`, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.sendFile(filepath, () => {
                setTimeout(() => fs.rmSync(tmpDir, { recursive: true, force: true }), 5000);
            });
        });
        return;
    } else {
        return res.status(400).json({ error: 'Format invalide' });
    }

    exec(cmd, { timeout: 300000 }, (err, stdout, stderr) => {
        if (err) {
            console.error(stderr);
            return res.status(500).json({ error: stderr || err.message });
        }

        const files = fs.readdirSync(tmpDir);
        if (files.length === 0) return res.status(500).json({ error: 'Aucun fichier cree' });

        const file = path.join(tmpDir, files[0]);
        const filename = files[0];

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.sendFile(file, () => {
            setTimeout(() => fs.rmSync(tmpDir, { recursive: true, force: true }), 5000);
        });
    });
});

app.listen(PORT, () => {
    console.log(`Serveur lance sur le port ${PORT}`);
});