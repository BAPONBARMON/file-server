import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './styles.css';

const apiBase = 'http://localhost:10000/api';

export default function App(){
  const [files,setFiles]=useState([]);
  const [parentFolder,setParent]=useState('/');
  const [selectedFiles,setSelected]=useState([]);

  const fetchFiles=async()=>{
    const res=await axios.get(`${apiBase}/files?parent=${parentFolder}`);
    setFiles(res.data);
  };

  useEffect(()=>{fetchFiles();},[parentFolder]);

  const uploadFiles=async()=>{
    const formData=new FormData();
    for(let i=0;i<selectedFiles.length;i++) formData.append('files',selectedFiles[i]);
    formData.append('parent',parentFolder);
    await axios.post(`${apiBase}/files`,formData);
    fetchFiles();
  };

  const deleteFile=async(id)=>{await axios.delete(`${apiBase}/files/${id}`);fetchFiles();};
  const downloadFile=(id)=>{window.open(`${apiBase}/files/${id}`);};
  const createFolder=async()=>{
    const name=prompt('Folder Name:');
    if(!name) return;
    await axios.post(`${apiBase}/folders`,{name,parent:parentFolder});
    fetchFiles();
  };

  return (<div className="p-4">
    <h1 className="text-2xl mb-4">Hacker File Manager</h1>
    <div className="flex gap-2 mb-4">
      <input type="file" multiple onChange={e=>setSelected(e.target.files)}/>
      <button className="border px-2" onClick={uploadFiles}>Upload</button>
      <button className="border px-2" onClick={createFolder}>New Folder</button>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {files.map(f=>(
        <div key={f.id} className="border p-2">
          <span>{f.name}</span>
          <div className="flex gap-1 mt-1">
            {f.type==='file'&&<button className="border px-1" onClick={()=>downloadFile(f.id)}>Download</button>}
            <button className="border px-1" onClick={()=>deleteFile(f.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  </div>);
}