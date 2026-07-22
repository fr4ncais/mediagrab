const express = require('express');
const { spawn } = require('child_process');
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

// SSE clients tracking
const clients = new Set();

app.get('/progress', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
    });
    res.write('data: {"status":"ready"}\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
});

function broadcastProgress(msg) {
    const data = JSON.stringify(msg);
    for (const client of clients) {
        client.write(`data: ${data}\n\n`);
    }
}

app.post('/download', (req, res) => {
    const { url, type } = req.body;

    if (!url) return res.status(400).json({ error: 'No link provided' });

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-'));
    const outputTemplate = path.join(tmpDir, '%(title)s.%(ext)s');

    if (type === '3') {
        const filename = 'image_' + Date.now() + '.png';
        const filepath = path.join(tmpDir, filename);
        const curl = spawn('curl', ['-L', '-o', filepath, url]);
        curl.on('close', (code) => {
            if (code !== 0) return res.status(500).json({ error: 'Download failed' });
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.sendFile(filepath, () => {
                setTimeout(() => fs.rmSync(tmpDir, { recursive: true, force: true }), 5000);
            });
        });
        return;
    }

    let args = [];
    if (type === '1') {
        args = ['-x', '--audio-format', 'mp3', '--cookies-from-browser', 'firefox', '--remote-components', 'ejs:github', '--newline', '-o', outputTemplate, url];
    } else if (type === '2') {
        args = ['-f', 'bestvideo[height<=1080][fps=60][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', '--cookies-from-browser', 'firefox', '--remote-components', 'ejs:github', '--newline', '-o', outputTemplate, url];
    } else {
        return res.status(400).json({ error: 'Invalid format' });
    }

    broadcastProgress({ status: 'starting', percent: 0, text: 'Starting download...' });

    const proc = spawn(`"${ytdlp}"`, args, {
        env: { ...process.env, PATH: envPath },
        shell: true
    });

    proc.stdout.on('data', (data) => {
        const line = data.toString();

        const progressMatch = line.match(/\[download\]\s+([\d.]+)%/);
        if (progressMatch) {
            const pct = parseFloat(progressMatch[1]);
            const sizeMatch = line.match(/of\s+([\d.]+\w+)/);
            const speedMatch = line.match(/at\s+([\d.]+\w+\/s)/);
            const etaMatch = line.match(/ETA\s+(\S+)/);

            broadcastProgress({
                status: 'downloading',
                percent: pct,
                size: sizeMatch ? sizeMatch[1] : '',
                speed: speedMatch ? speedMatch[1] : '',
                eta: etaMatch ? etaMatch[1] : ''
            });
        }

        if (line.includes('[ExtractAudio]') || line.includes('Converting')) {
            broadcastProgress({ status: 'converting', percent: 95, text: 'Converting audio...' });
        }

        if (line.includes('[Merger]') || line.includes('Merging')) {
            broadcastProgress({ status: 'merging', percent: 98, text: 'Merging...' });
        }
    });

    proc.stderr.on('data', (data) => {
        const line = data.toString();
        const progressMatch = line.match(/\[download\]\s+([\d.]+)%/);
        if (progressMatch) {
            broadcastProgress({ status: 'downloading', percent: parseFloat(progressMatch[1]) });
        }
    });

    proc.on('close', (code) => {
        broadcastProgress({ status: 'done', percent: 100 });

        if (code !== 0) {
            return res.status(500).json({ error: 'Download failed' });
        }

        const files = fs.readdirSync(tmpDir);
        if (files.length === 0) {
            return res.status(500).json({ error: 'No file created' });
        }

        const file = path.join(tmpDir, files[0]);
        const filename = files[0];

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.sendFile(file, () => {
            setTimeout(() => fs.rmSync(tmpDir, { recursive: true, force: true }), 5000);
        });
    });

    proc.on('error', (err) => {
        broadcastProgress({ status: 'error', text: err.message });
        res.status(500).json({ error: err.message });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});