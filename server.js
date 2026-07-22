const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = 3000;

const ytdlp = path.join(os.homedir(), 'AppData', 'Local', 'Python', 'pythoncore-3.14-64', 'Scripts', 'yt-dlp.exe');
const denoPath = path.join(os.homedir(), '.deno', 'bin');
const ffmpegPath = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages', 'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe', 'ffmpeg-8.1.2-full_build', 'bin');
const envPath = `${denoPath};${ffmpegPath};${process.env.PATH}`;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/download', (req, res) => {
    const { url, type } = req.body;

    if (!url) return res.status(400).json({ error: 'No link provided' });

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-'));
    const outputTemplate = path.join(tmpDir, '%(title)s.%(ext)s');

    let cmd = '';

    if (type === '1') {
        cmd = `"${ytdlp}" -x --audio-format mp3 --cookies-from-browser firefox --remote-components ejs:github -o "${outputTemplate}" "${url}"`;
    } else if (type === '2') {
        cmd = `"${ytdlp}" -f "bestvideo[height<=1080][fps=60][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --cookies-from-browser firefox --remote-components ejs:github -o "${outputTemplate}" "${url}"`;
    } else if (type === '3') {
        const filename = 'image_' + Date.now() + '.png';
        const filepath = path.join(tmpDir, filename);

        exec(`curl -L -o "${filepath}" "${url}"`, { env: { ...process.env, PATH: envPath } }, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.sendFile(filepath, () => {
                setTimeout(() => fs.rmSync(tmpDir, { recursive: true, force: true }), 5000);
            });
        });
        return;
    } else {
        return res.status(400).json({ error: 'Invalid format' });
    }

    exec(cmd, { timeout: 300000, env: { ...process.env, PATH: envPath } }, (err, stdout, stderr) => {
        if (err) {
            console.error(stderr);
            return res.status(500).json({ error: stderr || err.message });
        }

        const files = fs.readdirSync(tmpDir);
        if (files.length === 0) return res.status(500).json({ error: 'No file created' });

        const file = path.join(tmpDir, files[0]);
        const filename = files[0];

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.sendFile(file, () => {
            setTimeout(() => fs.rmSync(tmpDir, { recursive: true, force: true }), 5000);
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Open this page in your browser!');
});