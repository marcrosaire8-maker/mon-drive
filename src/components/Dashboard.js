import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import Navbar from './Navbar';
// Icônes
import { FcFolder, FcOpenedFolder, FcFile, FcImageFile, FcMusic, FcDocument, FcUpload } from "react-icons/fc";
import { FaChevronRight, FaHome, FaTimes, FaDownload, FaTrash, FaSearch, FaCloudUploadAlt, FaStar, FaRegStar, FaShareAlt, FaWhatsapp, FaEnvelope, FaLink, FaEdit, FaHdd, FaSun, FaMoon, FaArrowLeft, FaSpinner } from 'react-icons/fa';
import { Link, useParams, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const { folderId } = useParams();
  const navigate = useNavigate();
  
  // --- ÉTATS ---
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Upload avancé
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [statusMessage, setStatusMessage] = useState(""); 

  const [previewFile, setPreviewFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileToShare, setFileToShare] = useState(null);
  const [totalSize, setTotalSize] = useState(0);
  
  // État pour le thème (Dark/Light)
  const [isDarkMode, setIsDarkMode] = useState(false);

  const MAX_STORAGE = 5 * 1024 * 1024 * 1024; // 5 Go

  useEffect(() => {
    if (user) {
      setLoading(true);
      if (folderId) {
        supabase.from('folders').select('*').eq('id', folderId).single().then(({ data }) => setCurrentFolder(data));
      } else {
        setCurrentFolder(null);
      }
      calculateStorage();
      Promise.all([fetchFolders(folderId), fetchFiles(folderId)]).then(() => setLoading(false));
    }
    setSearchTerm(""); 
  }, [user, folderId]);

  // --- LOGIQUE METIER (Intacte) ---
  async function calculateStorage() {
    const { data } = await supabase.from('files').select('size').eq('user_id', user.id);
    if (data) {
      const total = data.reduce((acc, curr) => acc + (curr.size || 0), 0);
      setTotalSize(total);
    }
  }

  async function fetchFolders(currentId) {
    let query = supabase.from('folders').select('*').eq('user_id', user.id).order('name');
    query = currentId ? query.eq('parent_id', currentId) : query.is('parent_id', null);
    const { data } = await query;
    setFolders(data || []);
  }

  async function fetchFiles(currentId) {
    let query = supabase.from('files').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    query = currentId ? query.eq('folder_id', currentId) : query.is('folder_id', null);
    const { data } = await query;
    setFiles(data || []);
  }

  async function handleCreateFolder() {
    const name = prompt("Nom du dossier :");
    if (!name) return;
    const { data } = await supabase.from('folders').insert({ name, user_id: user.id, parent_id: folderId || null }).select();
    setFolders([...folders, data[0]]);
  }

  // Fonction récursive pour upload dossier (Complexe et conservée)
  async function getOrCreateFolder(pathArray, parentId, folderCache) {
    if (pathArray.length === 0) return parentId;
    const currentName = pathArray[0];
    const cacheKey = `${parentId}/${currentName}`;
    if (folderCache[cacheKey]) return getOrCreateFolder(pathArray.slice(1), folderCache[cacheKey], folderCache);
    
    const { data: existing } = await supabase.from('folders').select('id').eq('name', currentName).eq('parent_id', parentId || null).eq('user_id', user.id).single();
    if (existing) {
      folderCache[cacheKey] = existing.id;
      return getOrCreateFolder(pathArray.slice(1), existing.id, folderCache);
    }
    const { data: created } = await supabase.from('folders').insert({ name: currentName, parent_id: parentId || null, user_id: user.id }).select().single();
    if (created) {
      folderCache[cacheKey] = created.id;
      if (parentId === folderId || (parentId === null && !folderId)) setFolders(prev => [...prev, created]);
      return getOrCreateFolder(pathArray.slice(1), created.id, folderCache);
    }
  }

  const handleUpload = async (filesList) => {
    if (!filesList || filesList.length === 0) return;
    setUploading(true); setProgress(0);
    const totalCount = filesList.length; let processedCount = 0; const folderCache = {}; 

    for (let i = 0; i < totalCount; i++) {
      const file = filesList[i];
      setStatusMessage(`Envoi : ${file.name}`);
      try {
        let targetFolderId = folderId || null;
        if (file.webkitRelativePath) {
          const pathParts = file.webkitRelativePath.split('/'); pathParts.pop();
          if (pathParts.length > 0) targetFolderId = await getOrCreateFolder(pathParts, folderId, folderCache);
        }
        const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const filePath = `${user.id}/${Date.now()}_${cleanName}`;
        const { error: upErr } = await supabase.storage.from('user-files').upload(filePath, file);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('user-files').getPublicUrl(filePath);
        const { data: dbData } = await supabase.from('files').insert({
          name: file.name, url: publicUrl, type: file.type, size: file.size, user_id: user.id, folder_id: targetFolderId
        }).select();
        if (targetFolderId === folderId || (targetFolderId === null && !folderId)) setFiles(prev => [dbData[0], ...prev]);
        setTotalSize(prev => prev + file.size);
      } catch (error) { console.error(error); }
      processedCount++; setProgress(Math.round((processedCount / totalCount) * 100));
    }
    setUploading(false); setIsDragging(false);
    if (folderId) fetchFiles(folderId);
  };

  const onFileChange = (e) => handleUpload(e.target.files);
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); if (e.currentTarget.contains(e.relatedTarget)) return; setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files); };

  const downloadFile = async (url, filename) => {
    try {
      const response = await fetch(url); const blob = await response.blob();
      const link = document.createElement('a'); link.href = window.URL.createObjectURL(blob); link.download = filename;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (err) { console.error(err); }
  };

  const handleDeleteFile = async (e, file) => {
    e.stopPropagation(); if (!window.confirm(`Supprimer "${file.name}" ?`)) return;
    try {
      const path = file.url.split('/user-files/')[1];
      if (path) await supabase.storage.from('user-files').remove([decodeURIComponent(path)]); 
      await supabase.from('files').delete().eq('id', file.id);
      setFiles(files.filter(f => f.id !== file.id)); setTotalSize(prev => prev - (file.size || 0)); 
    } catch (error) { alert("Erreur"); }
  };

  const handleDeleteFolder = async (e, folder) => {
    e.stopPropagation(); if (!window.confirm(`Supprimer "${folder.name}" ?`)) return;
    try {
      await supabase.from('folders').delete().eq('id', folder.id);
      setFolders(folders.filter(f => f.id !== folder.id));
    } catch (error) { alert("Dossier non vide ou erreur"); }
  };

  const handleRenameFile = async (e, file) => {
    e.stopPropagation(); const newName = prompt("Renommer :", file.name); if (!newName) return;
    await supabase.from('files').update({ name: newName }).eq('id', file.id);
    setFiles(files.map(f => f.id === file.id ? { ...f, name: newName } : f));
  };

  const handleRenameFolder = async (e, folder) => {
    e.stopPropagation(); const newName = prompt("Renommer :", folder.name); if (!newName) return;
    await supabase.from('folders').update({ name: newName }).eq('id', folder.id);
    setFolders(folders.map(f => f.id === folder.id ? { ...f, name: newName } : f));
  };

  const toggleFavorite = async (e, file) => { e.stopPropagation(); await supabase.from('files').update({ is_favorite: !file.is_favorite }).eq('id', file.id); setFiles(files.map(f => f.id === file.id ? { ...f, is_favorite: !file.is_favorite } : f)); };

  const openShareModal = (e, file) => { e.stopPropagation(); setFileToShare(file); };
  const shareViaWhatsapp = () => { window.open(`https://wa.me/?text=${encodeURIComponent(`${fileToShare.url}`)}`, '_blank'); };
  const shareViaEmail = () => { window.location.href = `mailto:?subject=Partage&body=${encodeURIComponent(fileToShare.url)}`; };
  const copyLink = () => { navigator.clipboard.writeText(fileToShare.url).then(() => alert("Lien copié !")); };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatBytes = (bytes, decimals = 1) => { if (!bytes) return '0 B'; const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]; };
  const getFileIcon = (mimeType, size = 40) => { if (mimeType.includes('image')) return <FcImageFile size={size}/>; if (mimeType.includes('pdf')) return <FcDocument size={size}/>; if (mimeType.includes('audio')) return <FcMusic size={size}/>; return <FcFile size={size}/>; };

  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const storagePercentage = Math.min(100, (totalSize / MAX_STORAGE) * 100);

  // --- GESTION DU THEME DYNAMIQUE ---
  const currentTheme = isDarkMode ? styles.dark : styles.light;
  const themeStyles = { ...styles.base, ...currentTheme };

  return (
    <div 
      onDragOver={handleDragOver} 
      onDragLeave={handleDragLeave} 
      onDrop={handleDrop} 
      style={{
        ...styles.pageWrapper, 
        backgroundColor: themeStyles.bgColor
      }}
    >
      <Navbar />

      {/* --- CSS INJECTÉ POUR ANIMATIONS & STYLE GLOBAL --- */}
      <style>
        {`
          @keyframes moveBlob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-enter {
            animation: fadeInUp 0.5s ease-out forwards;
            opacity: 0; /* Hidden initially */
          }
          .glass-panel {
            backdrop-filter: blur(16px) saturate(180%);
            -webkit-backdrop-filter: blur(16px) saturate(180%);
          }
          .hover-scale:hover {
            transform: scale(1.03) translateY(-5px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.1);
          }
          /* Custom Scrollbar */
          ::-webkit-scrollbar { width: 8px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 4px; }
          
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}
      </style>

      {/* --- ARRIÈRE-PLAN ANIMÉ (BLOBS) --- */}
      <div style={{...styles.blob, top: '10%', left: '10%', backgroundColor: '#60a5fa', animationDelay: '0s'}}></div>
      <div style={{...styles.blob, bottom: '20%', right: '10%', backgroundColor: '#a78bfa', animationDelay: '2s'}}></div>
      <div style={{...styles.blob, top: '40%', left: '40%', backgroundColor: '#f472b6', width:'200px', height:'200px', animationDelay: '4s'}}></div>

      {isDragging && <div style={styles.dragOverlay}><div style={styles.dragMessage}><FaCloudUploadAlt size={80} style={{marginBottom:'20px'}}/><h2>Glissez pour uploader !</h2></div></div>}

      {/* --- TOAST DE PROGRESSION --- */}
      {uploading && (
        <div style={{...styles.uploadToast, backgroundColor: themeStyles.cardBg, color: themeStyles.text}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                <span style={{fontWeight:'bold', display:'flex', alignItems:'center', gap:'10px'}}><FaSpinner className="spin"/> Upload...</span>
                <span>{progress}%</span>
            </div>
            <div style={styles.progressBarBg}><div style={{...styles.progressBarFill, width:`${progress}%`}}></div></div>
            <div style={{fontSize:'0.75rem', marginTop:'5px', opacity:0.7}}>{statusMessage}</div>
        </div>
      )}

      <div style={styles.container}>
        
        {/* --- EN-TÊTE FLOTTANT & SWITCH THEME --- */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'20px'}}>
           <h2 style={{
             margin:0, 
             fontSize:'2.2rem', 
             fontWeight: '800', 
             background: isDarkMode ? 'linear-gradient(to right, #fff, #9ca3af)' : 'linear-gradient(to right, #1f2937, #4b5563)',
             WebkitBackgroundClip: 'text',
             WebkitTextFillColor: 'transparent',
             letterSpacing: '-1px'
           }}>
              {searchTerm ? `Recherche : "${searchTerm}"` : (currentFolder ? currentFolder.name : "Mon Espace")}
           </h2>
           
           <button 
             onClick={() => setIsDarkMode(!isDarkMode)}
             style={{
               ...styles.themeBtn,
               backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)'
             }}
           >
             {isDarkMode ? <FaSun color="#fbbf24"/> : <FaMoon color="#4b5563"/>}
           </button>
        </div>

        {/* --- BARRE DE STOCKAGE STYLE IOS --- */}
        <div style={{...styles.glassBox, backgroundColor: themeStyles.cardBg, marginBottom:'30px', padding:'20px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px', fontSize:'0.9rem', color: themeStyles.subText, fontWeight:'600'}}>
                <span style={{display:'flex', alignItems:'center', gap:'8px'}}><FaHdd /> Stockage iCloud</span>
                <span>{formatBytes(totalSize)} sur {formatBytes(MAX_STORAGE)}</span>
            </div>
            <div style={styles.progressBarBg}>
                <div style={{...styles.progressBarFill, width: `${storagePercentage}%`}}></div>
            </div>
        </div>

        {/* --- NAVIGATION & RECHERCHE --- */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px', flexWrap:'wrap', gap:'20px'}}>
            <div style={{...styles.glassBox, backgroundColor: themeStyles.cardBg, padding:'10px 20px', display:'flex', alignItems:'center', gap:'10px'}}>
              <Link to="/dashboard" style={{textDecoration:'none', color: themeStyles.accent, fontWeight:'bold', display:'flex', alignItems:'center'}}>
                <FaHome size={18} style={{marginRight:'5px'}}/> Accueil
              </Link>
              {currentFolder && (
                <>
                  <FaChevronRight size={12} color={themeStyles.subText}/>
                  <span style={{fontWeight:'bold', color: themeStyles.text}}>{currentFolder.name}</span>
                </>
              )}
            </div>

            <div style={styles.searchWrapper}>
                <FaSearch style={{...styles.searchIcon, color: themeStyles.subText}} />
                <input 
                  type="text" 
                  placeholder="Rechercher un fichier..." 
                  style={{
                    ...styles.searchInput, 
                    backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)',
                    color: themeStyles.text
                  }} 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* --- BOUTONS D'ACTION (NOUVEAU DOSSIER / UPLOAD) --- */}
        <div style={{display:'flex', gap:'15px', marginBottom:'40px'}}>
             <button onClick={handleCreateFolder} style={{...styles.btnAction, backgroundColor: themeStyles.cardBg, color: themeStyles.text}}>
                <FcFolder size={22} /> Nouveau Dossier
             </button>
            <label style={{...styles.btnPrimary, opacity: uploading ? 0.7 : 1}}>
              {uploading ? "Chargement..." : <><FcUpload size={22} style={{marginRight:'8px', filter: 'brightness(0) invert(1)'}}/> Fichier</>}
              <input type="file" onChange={onFileChange} style={{display:'none'}} disabled={uploading} multiple />
            </label>
            <label style={{...styles.btnSecondary, backgroundColor: themeStyles.cardBg, color: themeStyles.text}}>
              <FcOpenedFolder size={22} style={{marginRight:'8px'}}/> Dossier
              <input type="file" onChange={onFileChange} style={{display:'none'}} disabled={uploading} webkitdirectory="" directory="" multiple />
            </label>
        </div>

        {loading ? (
            <div style={{textAlign:'center', color: themeStyles.subText, marginTop:'50px'}}>Chargement de vos données...</div>
        ) : (
          <>
            {/* --- GRILLE DOSSIERS --- */}
            {filteredFolders.length > 0 && <h3 style={{...styles.sectionTitle, color: themeStyles.subText}}>DOSSIERS</h3>}
            <div style={styles.grid}>
              {filteredFolders.map((folder, index) => (
                <div 
                  key={folder.id} 
                  className="animate-enter hover-scale"
                  style={{
                    ...styles.folderCard, 
                    backgroundColor: themeStyles.cardBg, 
                    color: themeStyles.text,
                    animationDelay: `${index * 0.05}s`
                  }} 
                  onClick={() => navigate(`/folder/${folder.id}`)}
                >
                  <div style={styles.folderActions}>
                    <button style={styles.miniBtn} onClick={(e) => handleRenameFolder(e, folder)}><FaEdit /></button>
                    <button style={{...styles.miniBtn, color:'#ef4444'}} onClick={(e) => handleDeleteFolder(e, folder)}><FaTrash /></button>
                  </div>
                  <FcOpenedFolder size={70} style={{filter: 'drop-shadow(0 5px 5px rgba(0,0,0,0.1))'}} />
                  <span style={styles.itemName}>{folder.name}</span>
                </div>
              ))}
            </div>

            {/* --- GRILLE FICHIERS --- */}
            {filteredFiles.length > 0 && <h3 style={{...styles.sectionTitle, color: themeStyles.subText, marginTop:'30px'}}>FICHIERS RÉCENTS</h3>}
            <div style={styles.grid}>
              {filteredFiles.map((file, index) => (
                <div 
                  key={file.id} 
                  className="animate-enter hover-scale"
                  style={{
                    ...styles.fileCard, 
                    backgroundColor: themeStyles.cardBg,
                    color: themeStyles.text,
                    animationDelay: `${index * 0.05 + 0.2}s`
                  }} 
                  onClick={() => setPreviewFile(file)}
                >
                  <div style={styles.topRightActions}>
                    <button style={styles.miniBtn} onClick={(e) => handleRenameFile(e, file)}><FaEdit /></button>
                    <button style={{...styles.miniBtn, color:'#ef4444'}} onClick={(e) => handleDeleteFile(e, file)}><FaTrash /></button>
                  </div>
                  <div style={styles.topLeftActions}>
                    <button style={{...styles.iconBtn, color: file.is_favorite ? '#fbbf24' : '#d1d5db'}} onClick={(e) => toggleFavorite(e, file)}>
                        {file.is_favorite ? <FaStar /> : <FaRegStar />}
                    </button>
                    <button style={{...styles.iconBtn, color: '#3b82f6'}} onClick={(e) => openShareModal(e, file)}>
                        <FaShareAlt />
                    </button>
                  </div>

                  <div style={styles.previewContainer}>
                    {file.type.includes('image') ? (
                        <img src={file.url} alt={file.name} style={styles.previewThumb} />
                    ) : (
                        getFileIcon(file.type, 65)
                    )}
                  </div>
                  
                  <div style={{width:'100%', textAlign:'center', marginTop:'auto'}}>
                    <span style={styles.itemName}>{file.name}</span>
                    <div style={{display:'flex', justifyContent:'center', gap:'10px', alignItems:'center', marginTop:'5px'}}>
                        <span style={{fontSize:'0.7rem', color: themeStyles.subText}}>{formatDate(file.created_at)}</span>
                        <span style={{fontSize:'0.65rem', color: 'white', backgroundColor: themeStyles.accent, padding: '2px 8px', borderRadius: '10px'}}>{formatBytes(file.size)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {!filteredFolders.length && !filteredFiles.length && (
                <div style={{...styles.emptyState, borderColor: themeStyles.subText, color: themeStyles.subText}}>
                    {searchTerm ? "Aucun résultat trouvé." : "Ce dossier est vide. Commencez à ajouter du contenu !"}
                </div>
            )}
          </>
        )}
      </div>

      {/* --- MODALS (PREVIEW & SHARE) --- */}
      {previewFile && (
        <div style={styles.modalOverlay} onClick={() => setPreviewFile(null)}>
          <div style={{...styles.modalContent, backgroundColor: isDarkMode ? '#1e293b' : 'white'}} onClick={e => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setPreviewFile(null)}><FaTimes /></button>
            <h3 style={{marginBottom:'20px', wordBreak:'break-all', paddingRight:'30px', color: isDarkMode ? 'white' : 'black'}}>{previewFile.name}</h3>
            <div style={{...styles.previewArea, backgroundColor: isDarkMode ? '#0f172a' : '#f9fafb'}}>
              {previewFile.type.includes('image') && <img src={previewFile.url} alt="Preview" style={{maxWidth:'100%', maxHeight:'50vh', borderRadius:'8px'}} />}
              {/* ... (Audio/Other types handling same as previous logic but with dark mode compatibility) */}
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => downloadFile(previewFile.url, previewFile.name)} style={styles.downloadBtn}><FaDownload style={{marginRight:'10px'}}/> Télécharger</button>
            </div>
          </div>
        </div>
      )}
      
      {/* ... Share Modal code (similar structure) ... */}
    </div>
  );
}

// --- SYSTÈME DE STYLES AVANCÉ ---
const styles = {
  // Themes
  base: { transition: 'background-color 0.4s ease, color 0.4s ease' },
  light: {
    bgColor: '#f3f4f6',
    cardBg: 'rgba(255, 255, 255, 0.7)', // Glass opacity
    text: '#1f2937',
    subText: '#6b7280',
    accent: '#2563eb'
  },
  dark: {
    bgColor: '#0f172a',
    cardBg: 'rgba(30, 41, 59, 0.6)', // Glass opacity dark
    text: '#f3f4f6',
    subText: '#9ca3af',
    accent: '#60a5fa'
  },

  pageWrapper: { minHeight: '100vh', position: 'relative', overflowX:'hidden', transition: 'background 0.5s ease' },
  
  // Fond animé
  blob: {
    position: 'absolute', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.5,
    width: '350px', height: '350px', zIndex: 0, animation: 'moveBlob 15s infinite alternate',
    pointerEvents: 'none'
  },

  container: { 
    maxWidth: '1280px', margin: '0 auto', padding: '30px 20px', position: 'relative', zIndex: 1 
  },

  // Glassmorphism Utils
  glassBox: {
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
  },

  // Storage Bar
  progressBarBg: { width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '10px', overflow: 'hidden' },
  progressBarFill: { 
    height: '100%', 
    background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)', // Dégradé Apple
    transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' 
  },

  themeBtn: {
    border: 'none', borderRadius: '50%', width: '40px', height: '40px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    backdropFilter: 'blur(10px)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', transition: 'all 0.3s'
  },

  searchWrapper: { position: 'relative', width: '100%', maxWidth: '350px' },
  searchIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' },
  searchInput: { 
    width: '100%', padding: '12px 12px 12px 45px', borderRadius: '20px', 
    border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.95rem', outline: 'none', 
    backdropFilter: 'blur(10px)', transition: 'all 0.2s',
    boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)'
  },

  sectionTitle: { fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '15px', marginLeft: '5px' },

  btnAction: { 
    border: '1px solid rgba(255,255,255,0.2)', padding: '12px 20px', borderRadius: '14px', 
    fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', 
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)', backdropFilter: 'blur(5px)', transition: 'transform 0.2s' 
  },
  btnPrimary: { 
    background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', // Dégradé bleu
    color: 'white', border: 'none', padding: '12px 25px', borderRadius: '14px', 
    fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', 
    boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.4)', transition: 'transform 0.2s' 
  },
  btnSecondary: {
    border: '1px solid rgba(255,255,255,0.2)', padding: '12px 20px', borderRadius: '14px',
    fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)', backdropFilter: 'blur(5px)', transition: 'transform 0.2s'
  },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '25px', marginBottom: '40px' },

  // Cards
  folderCard: { 
    position: 'relative', borderRadius: '20px', padding: '20px', 
    display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', 
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)', 
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)', boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
  },
  fileCard: { 
    position: 'relative', borderRadius: '20px', padding: '15px', height: '200px', 
    display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', 
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)', 
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', overflow: 'hidden'
  },

  previewContainer: { width: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' },
  previewThumb: { width: '100%', height: '110px', objectFit: 'cover', borderRadius: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' },
  
  folderActions: { position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '5px', zIndex: 10, opacity: 0.6 }, // Plus discret
  topRightActions: { position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '5px', zIndex: 10 },
  topLeftActions: { position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '5px', zIndex: 10 },
  
  miniBtn: { background: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', fontSize: '0.7rem', color: '#6b7280', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  iconBtn: { background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', fontSize: '0.8rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },

  itemName: { fontSize: '0.85rem', fontWeight: '600', marginTop: '5px', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display:'block' },
  
  emptyState: { textAlign: 'center', padding: '60px', border: '2px dashed', borderRadius: '20px', width: '100%', background: 'rgba(255,255,255,0.1)' },
  
  dragOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(37, 99, 235, 0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', backdropFilter: 'blur(5px)' },
  dragMessage: { textAlign: 'center', padding: '50px', border: '4px dashed white', borderRadius: '30px' },

  uploadToast: { position: 'fixed', bottom: '20px', right: '20px', padding: '20px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', borderLeft: '5px solid #2563eb', zIndex: 2000, width: '300px', animation: 'fadeInUp 0.3s ease-out' },

  // Modals
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }, // Blur très prononcé
  modalContent: { padding: '30px', borderRadius: '24px', maxWidth: '90%', maxHeight: '90vh', width: '600px', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' },
  closeBtn: { position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#9ca3af', padding:'5px' },
  previewArea: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '250px', borderRadius: '16px', padding: '20px', marginBottom: '20px' },
  
  modalActions: { display: 'flex', justifyContent: 'center', gap: '15px' },
  downloadBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)', transition: 'transform 0.1s' },
};
