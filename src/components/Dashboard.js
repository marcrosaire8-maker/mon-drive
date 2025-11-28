import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import Navbar from './Navbar';
// Icônes
import { FcFolder, FcOpenedFolder, FcFile, FcImageFile, FcMusic, FcDocument, FcUpload } from "react-icons/fc";
import { FaChevronRight, FaHome, FaTimes, FaDownload, FaTrash, FaSearch, FaCloudUploadAlt, FaStar, FaRegStar, FaShareAlt, FaWhatsapp, FaEnvelope, FaLink, FaEdit, FaHdd, FaSun, FaMoon, FaArrowLeft } from 'react-icons/fa';
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
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileToShare, setFileToShare] = useState(null);
  const [totalSize, setTotalSize] = useState(0);
  
  // État pour le thème (Dark/Light)
  const [isDarkMode, setIsDarkMode] = useState(false);

  const MAX_STORAGE = 500 * 1024 * 1024; // 500 Mo

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

  // --- LOGIQUE METIER (Inchangée mais connectée au design) ---
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

  async function processUpload(file) {
    if (!file) return;
    if (totalSize + file.size > MAX_STORAGE) {
        alert("Espace de stockage insuffisant !");
        return;
    }
    setUploading(true);
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const filePath = `${user.id}/${Date.now()}_${cleanName}`;
      const { error: upErr } = await supabase.storage.from('user-files').upload(filePath, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('user-files').getPublicUrl(filePath);
      const { data: dbData } = await supabase.from('files').insert({
        name: file.name, url: publicUrl, type: file.type, size: file.size, user_id: user.id, folder_id: folderId || null
      }).select();
      setFiles(prev => [dbData[0], ...prev]);
      setTotalSize(prev => prev + file.size); 
    } catch (error) { alert("Erreur upload"); } finally { setUploading(false); setIsDragging(false); }
  }

  const handleFileUpload = (e) => processUpload(e.target.files[0]);
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); if (e.currentTarget.contains(e.relatedTarget)) return; setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length > 0) processUpload(e.dataTransfer.files[0]); };

  const downloadFile = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) { console.error(err); }
  };

  const handleDeleteFile = async (e, file) => {
    e.stopPropagation(); 
    if (!window.confirm(`Supprimer "${file.name}" ?`)) return;
    try {
      const path = file.url.split('/user-files/')[1];
      if (path) await supabase.storage.from('user-files').remove([decodeURIComponent(path)]); 
      const { error } = await supabase.from('files').delete().eq('id', file.id);
      if (error) throw error;
      setFiles(files.filter(f => f.id !== file.id));
      setTotalSize(prev => prev - (file.size || 0)); 
    } catch (error) { alert("Erreur suppression"); }
  };

  const handleDeleteFolder = async (e, folder) => {
    e.stopPropagation();
    const { count: fc } = await supabase.from('files').select('*', { count: 'exact', head: true }).eq('folder_id', folder.id);
    const { count: dc } = await supabase.from('folders').select('*', { count: 'exact', head: true }).eq('parent_id', folder.id);
    if (fc > 0 || dc > 0) { alert("Ce dossier n'est pas vide !"); return; }
    if (!window.confirm(`Supprimer "${folder.name}" ?`)) return;
    try {
      const { error } = await supabase.from('folders').delete().eq('id', folder.id);
      if (error) throw error;
      setFolders(folders.filter(f => f.id !== folder.id));
    } catch (error) { alert("Erreur suppression"); }
  };

  const handleRenameFile = async (e, file) => {
    e.stopPropagation();
    const newName = prompt("Renommer le fichier :", file.name);
    if (!newName || newName === file.name) return;
    try {
      const { error } = await supabase.from('files').update({ name: newName }).eq('id', file.id);
      if (error) throw error;
      setFiles(files.map(f => f.id === file.id ? { ...f, name: newName } : f));
    } catch (error) { alert("Erreur renommage"); }
  };

  const handleRenameFolder = async (e, folder) => {
    e.stopPropagation();
    const newName = prompt("Renommer le dossier :", folder.name);
    if (!newName || newName === folder.name) return;
    try {
      const { error } = await supabase.from('folders').update({ name: newName }).eq('id', folder.id);
      if (error) throw error;
      setFolders(folders.map(f => f.id === folder.id ? { ...f, name: newName } : f));
    } catch (error) { alert("Erreur renommage"); }
  };

  const toggleFavorite = async (e, file) => {
    e.stopPropagation();
    try {
      const newVal = !file.is_favorite;
      await supabase.from('files').update({ is_favorite: newVal }).eq('id', file.id);
      setFiles(files.map(f => f.id === file.id ? { ...f, is_favorite: newVal } : f));
    } catch (error) { console.error(error); }
  };

  const openShareModal = (e, file) => { e.stopPropagation(); setFileToShare(file); };
  const shareViaWhatsapp = () => { window.open(`https://wa.me/?text=${encodeURIComponent(`Fichier : ${fileToShare.name} \n${fileToShare.url}`)}`, '_blank'); };
  const shareViaEmail = () => { window.location.href = `mailto:?subject=${encodeURIComponent(`Partage`)}&body=${encodeURIComponent(`${fileToShare.url}`)}`; };
  const copyLink = () => { navigator.clipboard.writeText(fileToShare.url).then(() => alert("Lien copié !")); };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatBytes = (bytes, decimals = 1) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals < 0 ? 0 : decimals)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType, size = 40) => {
    if (!mimeType) return <FcFile size={size}/>;
    if (mimeType.includes('image')) return <FcImageFile size={size}/>;
    if (mimeType.includes('pdf')) return <FcDocument size={size}/>;
    if (mimeType.includes('audio')) return <FcMusic size={size}/>;
    return <FcFile size={size}/>;
  };

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

      {/* --- CSS INJECTÉ POUR ANIMATIONS --- */}
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
          /* Scrollbar personnalisée */
          ::-webkit-scrollbar { width: 8px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 4px; }
        `}
      </style>

      {/* --- ARRIÈRE-PLAN ANIMÉ (BLOBS) --- */}
      <div style={{...styles.blob, top: '10%', left: '10%', backgroundColor: '#60a5fa', animationDelay: '0s'}}></div>
      <div style={{...styles.blob, bottom: '20%', right: '10%', backgroundColor: '#a78bfa', animationDelay: '2s'}}></div>
      <div style={{...styles.blob, top: '40%', left: '40%', backgroundColor: '#f472b6', width:'200px', height:'200px', animationDelay: '4s'}}></div>

      {isDragging && <div style={styles.dragOverlay}><div style={styles.dragMessage}><FaCloudUploadAlt size={80} style={{marginBottom:'20px'}}/><h2>Glissez pour uploader !</h2></div></div>}

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
              {uploading ? "Chargement..." : <><FcUpload size={22} style={{marginRight:'8px', filter: 'brightness(0) invert(1)'}}/> Importer un fichier</>}
              <input type="file" onChange={handleFileUpload} style={{display:'none'}} disabled={uploading} />
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
                    animationDelay: `${index * 0.05}s` // Effet cascade
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
                    animationDelay: `${index * 0.05 + 0.2}s` // Décalage après les dossiers
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

      {/* --- MODAL PREVIEW (GLASS STYLE) --- */}
      {previewFile && (
        <div style={styles.modalOverlay} onClick={() => setPreviewFile(null)}>
          <div style={{...styles.modalContent, backgroundColor: isDarkMode ? '#1e293b' : 'white'}} onClick={e => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setPreviewFile(null)}><FaTimes /></button>
            <h3 style={{marginBottom:'20px', wordBreak:'break-all', paddingRight:'30px', color: isDarkMode ? 'white' : 'black'}}>{previewFile.name}</h3>
            <div style={{...styles.previewArea, backgroundColor: isDarkMode ? '#0f172a' : '#f9fafb'}}>
              {previewFile.type.includes('image') && <img src={previewFile.url} alt="Preview" style={{maxWidth:'100%', maxHeight:'50vh', borderRadius:'8px', boxShadow:'0 10px 30px rgba(0,0,0,0.3)'}} />}
              {previewFile.type.includes('audio') && (
                <div style={{textAlign:'center', width:'100%'}}>
                   <FcMusic size={100} style={{marginBottom:'20px'}}/>
                   <audio controls autoPlay style={{width:'100%'}}><source src={previewFile.url} type={previewFile.type} /></audio>
                </div>
              )}
              {!previewFile.type.includes('image') && !previewFile.type.includes('audio') && (
                 <div style={{textAlign:'center'}}>{getFileIcon(previewFile.type, 100)}<p style={{marginTop:'20px', color: isDarkMode?'#9ca3af':'#4b5563'}}>Aperçu non disponible.</p></div>
              )}
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => downloadFile(previewFile.url, previewFile.name)} style={styles.downloadBtn}><FaDownload style={{marginRight:'10px'}}/> Télécharger</button>
              <button onClick={(e) => openShareModal(e, previewFile)} style={styles.shareBtn}><FaShareAlt style={{marginRight:'10px'}}/> Partager</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL SHARE --- */}
      {fileToShare && (
        <div style={styles.modalOverlay} onClick={() => setFileToShare(null)}>
            <div style={{...styles.shareModalContent, backgroundColor: isDarkMode ? '#1e293b' : 'white'}} onClick={e => e.stopPropagation()}>
                <button style={styles.closeBtn} onClick={() => setFileToShare(null)}><FaTimes /></button>
                <h3 style={{marginBottom:'20px', textAlign: 'center', color: isDarkMode?'white':'black'}}>Partager</h3>
                <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                    <button onClick={shareViaWhatsapp} style={{...styles.shareOptionBtn, backgroundColor: '#25D366', color: 'white'}}><FaWhatsapp size={24} /> WhatsApp</button>
                    <button onClick={shareViaEmail} style={{...styles.shareOptionBtn, backgroundColor: '#EA4335', color: 'white'}}><FaEnvelope size={22} /> Email</button>
                    <button onClick={copyLink} style={{...styles.shareOptionBtn, backgroundColor: '#3b82f6', color: 'white'}}><FaLink size={20} /> Copier Lien</button>
                </div>
            </div>
        </div>
      )}
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

  // Modals
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }, // Blur très prononcé
  modalContent: { padding: '30px', borderRadius: '24px', maxWidth: '90%', maxHeight: '90vh', width: '600px', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' },
  shareModalContent: { padding: '40px', borderRadius: '24px', width: '350px', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' },
  closeBtn: { position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#9ca3af', padding:'5px' },
  previewArea: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '250px', borderRadius: '16px', padding: '20px', marginBottom: '20px' },
  
  modalActions: { display: 'flex', justifyContent: 'center', gap: '15px' },
  downloadBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)', transition: 'transform 0.1s' },
  shareBtn: { backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)', transition: 'transform 0.1s' },
  shareOptionBtn: { border: 'none', padding: '15px', borderRadius: '14px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'center', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }
};
