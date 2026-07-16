const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = 3000;

const ytdlp = path.join(os.homedir(), 'AppData', 'Local', 'Python', 'pythoncore-3.14-64', 'Scripts', 'yt-dlp.exe');
const desktop = path.join(os.homedir(), 'Desktop');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/download', (req, res) => {
    const { url, type } = req.body;

    if (!url) return res.status(400).json({ error: 'Lien manquant' });

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-'));
    const outputTemplate = path.join(tmpDir, '%(title)s.%(ext)s');

    let args = [];

    if (type === '1') {
        args = [
            '-x', '--audio-format', 'mp3',
            '--cookies-from-browser', 'firefox',
            '--remote-components', 'ejs:github',
            '-o', outputTemplate,
            url
        ];
    } else if (type === '2') {
        args = [
            '-f', 'bestvideo[height<=1080][fps=60][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '--cookies-from-browser', 'firefox',
            '--remote-components', 'ejs:github',
            '-o', outputTemplate,
            url
        ];
    } else if (type === '3') {
        const ext = '.png';
        const filename = 'image_' + Date.now() + ext;
        const filepath = path.join(tmpDir, filename);

        execFile('powershell', [
            '-Command',
            `Invoke-WebRequest -Uri '${url}' -OutFile '${filepath}'`
        ], (err) => {
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

    const proc = execFile(ytdlp, args, { timeout: 300000 }, (err, stdout, stderr) => {
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
    console.log(`Serveur lance sur http://localhost:${PORT}`);
});