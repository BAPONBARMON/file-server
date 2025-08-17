const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Storage folder
const storagePath = path.join(__dirname, 'storage');
if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });

// Setup multer
const upload = multer({ storage: multer.memoryStorage() });

// SQLite DB
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        upload_time INTEGER
    )`);
});

// Upload files
app.post('/upload', upload.array('files'), (req, res) => {
    if (!req.files) return res.status(400).send('No files uploaded');

    req.files.forEach(file => {
        const filePath = path.join(storagePath, file.originalname);
        fs.writeFileSync(filePath, file.buffer);
        db.run(`INSERT INTO files (name, upload_time) VALUES (?, ?)`, [file.originalname, Date.now()]);
    });
    res.send({ message: 'Files uploaded successfully' });
});

// List files
app.get('/files', (req, res) => {
    db.all(`SELECT * FROM files`, [], (err, rows) => {
        if (err) return res.status(500).send(err);
        res.send(rows);
    });
});

// Download file
app.get('/download/:filename', (req, res) => {
    const filePath = path.join(storagePath, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
    res.download(filePath);
});

// Delete file
app.delete('/delete/:filename', (req, res) => {
    const filePath = path.join(storagePath, req.params.filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        db.run(`DELETE FROM files WHERE name = ?`, [req.params.filename]);
        res.send({ message: 'File deleted' });
    } else {
        res.status(404).send({ message: 'File not found' });
    }
});

// Auto-delete after 5 days
setInterval(() => {
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
    db.all(`SELECT * FROM files WHERE upload_time < ?`, [fiveDaysAgo], (err, rows) => {
        if (err) return;
        rows.forEach(file => {
            const filePath = path.join(storagePath, file.name);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            db.run(`DELETE FROM files WHERE id = ?`, [file.id]);
        });
    });
}, 60 * 60 * 1000); // every 1 hour

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
