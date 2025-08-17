
const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use('/storage', express.static(path.join(__dirname, 'storage')));

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT,
    path TEXT,
    type TEXT,
    size INTEGER,
    parentFolder TEXT,
    uploadedAt INTEGER
  )`);
});

const storageDir = path.join(__dirname, 'storage');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, storageDir),
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// List files/folders
app.get('/api/files', (req, res) => {
  const parent = req.query.parent || '/';
  db.all('SELECT * FROM files WHERE parentFolder = ?', [parent], (err, rows) => {
    if(err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Upload files
app.post('/api/files', upload.array('files'), (req, res) => {
  const parent = req.body.parent || '/';
  const now = Date.now();
  req.files.forEach(file => {
    db.run('INSERT INTO files (id, name, path, type, size, parentFolder, uploadedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), file.originalname, file.path, 'file', file.size, parent, now]);
  });
  res.json({ success: true });
});

// Create folder
app.post('/api/folders', (req, res) => {
  const { name, parent } = req.body;
  const folderId = uuidv4();
  const folderPath = path.join(storageDir, folderId);
  fs.mkdirSync(folderPath);
  db.run('INSERT INTO files (id, name, path, type, size, parentFolder, uploadedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [folderId, name, folderPath, 'folder', 0, parent || '/', Date.now()]);
  res.json({ success: true, id: folderId });
});

// Download file
app.get('/api/files/:id', (req, res) => {
  const fileId = req.params.id;
  db.get('SELECT * FROM files WHERE id = ?', [fileId], (err, row) => {
    if(!row) return res.status(404).send('File not found');
    if(row.type==='file') res.download(row.path, row.name);
    else res.status(400).send('Cannot download a folder');
  });
});

// Delete file/folder
app.delete('/api/files/:id', (req, res) => {
  const fileId = req.params.id;
  db.get('SELECT * FROM files WHERE id = ?', [fileId], (err, row) => {
    if(!row) return res.status(404).send('File not found');
    if(row.type==='file') fs.unlinkSync(row.path);
    else fs.rmdirSync(row.path, { recursive: true });
    db.run('DELETE FROM files WHERE id = ?', [fileId]);
    res.json({ success: true });
  });
});

// Auto-delete after 5 days
setInterval(()=>{
  const now = Date.now();
  db.all('SELECT * FROM files', (err, rows)=>{
    rows.forEach(file=>{
      if(now - file.uploadedAt > 5*24*60*60*1000){
        if(fs.existsSync(file.path)){
          if(file.type==='file') fs.unlinkSync(file.path);
          else fs.rmdirSync(file.path,{recursive:true});
        }
        db.run('DELETE FROM files WHERE id = ?', [file.id]);
      }
    });
  });
}, 60*60*1000);

app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
