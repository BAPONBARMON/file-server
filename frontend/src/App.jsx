import React, { useState, useEffect } from 'react';
import './styles.css';

function App() {
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(null);

  const fetchFiles = async () => {
    const res = await fetch('https://file-server-1-tdok.onrender.com/files');
    const data = await res.json();
    setFiles(data);
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFiles) return alert('Select files first');
    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('files', selectedFiles[i]);
    }
    try {
      const res = await fetch('https://file-server-1-tdok.onrender.com/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      alert(data.message);
      fetchFiles();
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };

  const handleDelete = async (filename) => {
    await fetch(`https://file-server-1-tdok.onrender.com/delete/${filename}`, { method: 'DELETE' });
    fetchFiles();
  };

  return (
    <div className="app">
      <h1>Hacker File Manager</h1>
      <form onSubmit={handleUpload}>
        <input type="file" multiple onChange={e => setSelectedFiles(e.target.files)} />
        <button type="submit">Upload</button>
      </form>
      <h2>Files</h2>
      <ul>
        {files.map(f => (
          <li key={f.id}>
            {f.name} 
            <a href={`https://file-server-1-tdok.onrender.com/download/${f.name}`} target="_blank" rel="noreferrer">Download</a>
            <button onClick={() => handleDelete(f.name)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
