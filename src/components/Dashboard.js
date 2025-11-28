import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import Navbar from './Navbar';
import { FcFolder, FcOpenedFolder, FcFile, FcImageFile, FcMusic, FcDocument, FcUpload } from "react-icons/fc";
import { FaChevronRight, FaHome, FaTimes, FaDownload, FaTrash, FaSearch, FaCloudUploadAlt, FaStar, FaRegStar, FaShareAlt, FaWhatsapp, FaEnvelope, FaLink, FaEdit, FaHdd, FaSpinner } from 'react-icons/fa';
import { Link, useParams, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const { folderId } = useParams();
  const navigate = useNavigate();
  
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // --- ÉTATS D'UPLOAD AVANCÉS ---
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0); // 0 à 100
  const [statusMessage, setStatusMessage] = useState(""); // "3/15 fichiers traités..."

  const [previewFile, setPreviewFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileToShare, setFileToShare] = useState(null);
  const [totalSize, setTotalSize] = useState(0);
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
    if (data) setFolders([...folders, data[0]]);
  }

  // --- LOGIQUE PUISSANTE : CRÉATION RÉCURSIVE DE DOSSIERS ---
  // Cette fonction trouve ou crée un dossier dans la base de données
  async function getOrCreateFolder(pathArray, parentId, folderCache) {
    if (pathArray.length === 0) return parentId;

    const currentName = pathArray[0];
    const cacheKey = `${parentId}/${currentName}`;

    // 1. Vérifier le cache local pour éviter trop d'appels API
    if (folderCache[cacheKey]) {
      return getOrCreateFolder(pathArray.slice(1), folderCache[cacheKey], folderCache);
    }

    // 2. Vérifier si le dossier existe déjà dans la DB
    const { data: existing } = await supabase
      .from('folders')
      .select('id')
      .eq('name', currentName)
      .eq('parent_id', parentId || null) // Gestion du root (null)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      folderCache[cacheKey] = existing.id;
      return getOrCreateFolder(pathArray.slice(1), existing.id, folderCache);
    }

    // 3. Créer le dossier s'il n'existe pas
    const { data: created } = await supabase
      .from('folders')
      .insert({ name: currentName, parent_id: parentId || null, user_id: user.id })
      .select()
      .single();

    if (created) {
      folderCache[cacheKey] = created.id;
      // Si on est à la racine visuelle actuelle, on met à jour l'affichage immédiatement
      if (parentId === folderId || (parentId === null && !folderId)) {
        setFolders(prev => [...prev, created]);
      }
      return getOrCreateFolder(pathArray.slice(1), created.id, folderCache);
    }
  }

  // --- GESTIONNAIRE D'UPLOAD UNIFIÉ (FICHIERS + DOSSIERS) ---
  const handleUpload = async (filesList) => {
    if (!filesList || filesList.length === 0) return;

    setUploading(true);
    setProgress(0);
    const totalCount = filesList.length;
    let processedCount = 0;
    
    // Cache pour mémoriser les dossiers créés pendant cet upload
    const folderCache = {}; 

    for (let i = 0; i < totalCount; i++) {
      const file = filesList[i];
      setStatusMessage(`Traitement : ${file.name} (${i + 1}/${totalCount})`);

      try {
        // --- A. GESTION DE LA STRUCTURE ---
        let targetFolderId = folderId || null; // Par défaut : dossier actuel

        // Si c'est un upload de dossier, file.webkitRelativePath ressemble à "MonDossier/SousDossier/img.png"
        if (file.webkitRelativePath) {
          const pathParts = file.webkitRelativePath.split('/');
          pathParts.pop(); // On enlève le nom du fichier pour garder que les dossiers
          
          if (pathParts.length > 0) {
            // On trouve ou crée les dossiers parents
            targetFolderId = await getOrCreateFolder(pathParts, folderId, folderCache);
          }
        }

        // --- B. UPLOAD PHYSIQUE ---
        const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const filePath = `${user.id}/${Date.now()}_${cleanName}`;
        
        const { error: upErr } = await supabase.storage.from('user-files').upload(filePath, file);
        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage.from('user-files').getPublicUrl(filePath);

        // --- C. ENREGISTREMENT BDD ---
        const { data: dbData } = await supabase.from('files').insert({
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size,
          user_id: user.id,
          folder_id: targetFolderId // On met le fichier dans le bon dossier (créé ou actuel)
        }).select();

        // Mise à jour visuelle (seulement si le fichier est dans le dossier courant qu'on regarde)
        if (targetFolderId === folderId || (targetFolderId === null && !folderId)) {
            setFiles(prev => [dbData[0], ...prev]);
        }
        
        setTotalSize(prev => prev + file.size);

      } catch (error) {
        console.error(`Erreur sur ${file.name}:`, error);
      }

      // Mise à jour barre de progression
      processedCount++;
      setProgress(Math.round((processedCount / totalCount) * 100));
    }

    setUploading(false);
    setIsDragging(false);
    alert("✅ Upload terminé !");
    // Petit refresh pour être sûr que tout est synchro
    if (folderId) fetchFiles(folderId);
  };

  // Handlers événements
  const onFileChange = (e) => handleUpload(e.target.files);
  
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.items) {
        // Astuce pour récupérer dossiers via Drop (complexe, on simplifie en prenant les fichiers)
        // Pour un vrai support dossier en Drop, il faut user de webkitGetAsEntry (plus avancé).
        // Ici on gère le drop de fichiers multiples standard.
        const droppedFiles = [];
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
            droppedFiles.push(e.dataTransfer.files[i]);
        }
        handleUpload(droppedFiles);
    }
  };

  // ... (Fonctions Download, Delete, Rename, Favorite restent identiques) ...
  // JE LES REMETS POUR QUE LE CODE SOIT COMPLET ET COPIABLE DIRECTEMENT
  
  const downloadFile = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl; link.download = filename;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
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
      const { error } = await supabase.from('files').update({ is_favorite: newVal }).eq('id', file.id);
      if (error) throw error;
      setFiles(files.map(f => f.id === file.id ? { ...f, is_favorite: newVal } : f));
    } catch (error) { console.error("Erreur favori", error); }
  };

  const openShareModal = (e, file) => { e.stopPropagation(); setFileToShare(file); };
  const shareViaWhatsapp = () => { window.open(`https://wa.me/?text=${encodeURIComponent(`Voici un fichier : ${fileToShare.name} \n${fileToShare.url}`)}`, '_blank'); };
  const shareViaEmail = () => { window.location.href = `mailto:?subject=${encodeURIComponent(`Partage: ${fileToShare.name}`)}&body=${encodeURIComponent(`Lien : ${fileToShare.url}`)}`; };
  const copyLink = () => { navigator.clipboard.writeText(fileToShare.url).then(() => alert("Lien copié !")); };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatBytes = (bytes, decimals = 1) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
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

  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} style={{minHeight: '100vh', position: 'relative'}}>
      <Navbar />
      
      {isDragging && <div style={styles.dragOverlay}><div style={styles.dragMessage}><FaCloudUploadAlt size={80} style={{marginBottom:'20px'}}/><h2>Glissez vos dossiers ou fichiers ici</h2></div></div>}

      {/* --- BARRE DE PROGRESSION GLOBALE --- */}
      {uploading && (
        <div style={styles.uploadToast}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                <span style={{fontWeight:'bold', display:'flex', alignItems:'center', gap:'10px'}}>
                    <FaSpinner className="spin"/> Upload en cours...
                </span>
                <span>{progress}%</span>
            </div>
            {/* Jauge de progression */}
            <div style={{width:'100%', height:'6px', background:'#e2e8f0', borderRadius:'3px', overflow:'hidden'}}>
                <div style={{width:`${progress}%`, height:'100%', background:'#2563eb', transition:'width 0.3s'}}></div>
            </div>
            <div style={{fontSize:'0.8rem', marginTop:'5px', color:'#64748b'}}>{statusMessage}</div>
        </div>
      )}

      <div style={styles.container}>
        
        <div style={styles.storageBarContainer}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px', fontSize:'0.85rem', color:'#4b5563'}}>
                <span style={{display:'flex', alignItems:'center', gap:'5px'}}><FaHdd /> Stockage utilisé</span>
                <span>{formatBytes(totalSize)} / {formatBytes(MAX_STORAGE)}</span>
            </div>
            <div style={styles.progressBarBg}>
                <div style={{...styles.progressBarFill, width: `${storagePercentage}%`}}></div>
            </div>
        </div>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px', flexWrap:'wrap', gap:'20px'}}>
            <div style={styles.breadcrumbs}>
              <Link to="/dashboard" style={styles.crumbLink}><FaHome style={{marginRight:'5px'}}/> Accueil</Link>
              {currentFolder && <><FaChevronRight style={{margin:'0 10px', fontSize:'0.8rem'}} /><span style={{fontWeight:'bold', color:'#2563eb'}}>{currentFolder.name}</span></>}
            </div>
            <div style={styles.searchWrapper}>
                <FaSearch style={styles.searchIcon} />
                <input type="text" placeholder="Rechercher..." style={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
            </div>
        </div>

        <div style={styles.header}>
          <h2 style={{margin:0, fontSize:'1.8rem', color:'#1f2937'}}>
            {searchTerm ? `Résultats : "${searchTerm}"` : (currentFolder ? currentFolder.name : "Mon Espace")}
          </h2>
          <div style={{display:'flex', gap:'10px'}}>
             <button onClick={handleCreateFolder} style={styles.btnAction}><FcFolder size={20} /> Nouveau Dossier</button>
            
            {/* BOUTON UPLOAD FICHIER */}
            <label style={uploading ? styles.btnDisabled : styles.btnPrimary}>
              {uploading ? "..." : <><FcUpload size={20} style={{marginRight:'5px', filter: 'brightness(0) invert(1)'}}/> Fichier</>}
              <input type="file" onChange={onFileChange} style={{display:'none'}} disabled={uploading} multiple />
            </label>

            {/* --- NOUVEAU : BOUTON UPLOAD DOSSIER --- */}
            <label style={uploading ? styles.btnDisabled : styles.btnSecondary}>
              <FcOpenedFolder size={20} style={{marginRight:'5px'}}/> Dossier
              {/* L'attribut magique webkitdirectory permet de sélectionner un dossier */}
              <input 
                type="file" 
                onChange={onFileChange} 
                style={{display:'none'}} 
                disabled={uploading} 
                webkitdirectory="" 
                directory="" 
                multiple 
              />
            </label>

          </div>
        </div>

        {loading ? <p>Chargement...</p> : (
          <>
            <div style={styles.grid}>
              {filteredFolders.map(folder => (
                <div key={folder.id} style={styles.folderCard} onClick={() => navigate(`/folder/${folder.id}`)}>
                  <div style={styles.folderActions}>
                    <button style={styles.miniBtn} onClick={(e) => handleRenameFolder(e, folder)} title="Renommer"><FaEdit /></button>
                    <button style={{...styles.miniBtn, color:'#ef4444'}} onClick={(e) => handleDeleteFolder(e, folder)} title="Supprimer"><FaTrash /></button>
                  </div>
                  <FcOpenedFolder size={60} />
                  <span style={styles.itemName}>{folder.name}</span>
                </div>
              ))}
            </div>

            <div style={styles.grid}>
              {filteredFiles.map(file => (
                <div key={file.id} style={styles.fileCard} onClick={() => setPreviewFile(file)}>
                  <div style={styles.topRightActions}>
                    <button style={styles.miniBtn} onClick={(e) => handleRenameFile(e, file)} title="Renommer"><FaEdit /></button>
                    <button style={{...styles.miniBtn, color:'#ef4444'}} onClick={(e) => handleDeleteFile(e, file)} title="Supprimer"><FaTrash /></button>
                  </div>
                  <div style={styles.topLeftActions}>
                    <button style={{...styles.iconBtn, color: file.is_favorite ? '#fbbf24' : '#d1d5db'}} onClick={(e) => toggleFavorite(e, file)} title="Favori">
                        {file.is_favorite ? <FaStar /> : <FaRegStar />}
                    </button>
                    <button style={{...styles.iconBtn, color: '#3b82f6'}} onClick={(e) => openShareModal(e, file)} title="Partager">
                        <FaShareAlt />
                    </button>
                  </div>

                  {file.type.includes('image') ? <img src={file.url} alt={file.name} style={styles.previewThumb} /> : getFileIcon(file.type, 60)}
                  
                  <div style={{width:'100%', textAlign:'center'}}>
                    <span style={styles.itemName}>{file.name}</span>
                    <div style={{display:'flex', justifyContent:'center', gap:'10px', alignItems:'center'}}>
                        <span style={styles.itemDate}>{formatDate(file.created_at)}</span>
                        <span style={styles.itemSize}>{formatBytes(file.size)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!filteredFolders.length && !filteredFiles.length && <div style={styles.emptyState}>{searchTerm ? "Aucun résultat." : "Dossier vide. Glissez un fichier ici !"}</div>}
          </>
        )}
      </div>

      {previewFile && (
        <div style={styles.modalOverlay} onClick={() => setPreviewFile(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setPreviewFile(null)}><FaTimes /></button>
            <h3 style={{marginBottom:'20px', wordBreak:'break-all', paddingRight:'30px'}}>{previewFile.name}</h3>
            <div style={styles.previewArea}>
              {previewFile.type.includes('image') && <img src={previewFile.url} alt="Preview" style={{maxWidth:'100%', maxHeight:'60vh', borderRadius:'8px'}} />}
              {previewFile.type.includes('audio') && (
                <div style={{textAlign:'center', width:'100%'}}>
                   <FcMusic size={100} style={{marginBottom:'20px'}}/>
                   <audio controls autoPlay style={{width:'100%'}}><source src={previewFile.url} type={previewFile.type} /></audio>
                </div>
              )}
              {!previewFile.type.includes('image') && !previewFile.type.includes('audio') && (
                 <div style={{textAlign:'center'}}>{getFileIcon(previewFile.type, 100)}<p style={{marginTop:'20px'}}>Aperçu non disponible.</p></div>
              )}
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => downloadFile(previewFile.url, previewFile.name)} style={styles.downloadBtn}><FaDownload style={{marginRight:'10px'}}/> Télécharger</button>
              <button onClick={(e) => openShareModal(e, previewFile)} style={styles.shareBtn}><FaShareAlt style={{marginRight:'10px'}}/> Partager</button>
            </div>
          </div>
        </div>
      )}

      {fileToShare && (
        <div style={styles.modalOverlay} onClick={() => setFileToShare(null)}>
            <div style={styles.shareModalContent} onClick={e => e.stopPropagation()}>
                <button style={styles.closeBtn} onClick={() => setFileToShare(null)}><FaTimes /></button>
                <h3 style={{marginBottom:'20px', textAlign: 'center'}}>Partager "{fileToShare.name}"</h3>
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

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' },
  storageBarContainer: { marginBottom: '30px', backgroundColor: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  progressBarBg: { width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#2563eb', transition: 'width 0.5s ease-in-out' },
  
  dragOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(37, 99, 235, 0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' },
  dragMessage: { textAlign: 'center', padding: '40px', border: '3px dashed white', borderRadius: '20px' },
  
  // STYLE TOAST AVANCÉ (AVEC BARRE)
  uploadToast: { position: 'fixed', bottom: '20px', right: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', borderLeft: '5px solid #2563eb', zIndex: 2000, width: '300px', animation: 'slideIn 0.3s ease-out' },

  searchWrapper: { position: 'relative', width: '100%', maxWidth: '400px' },
  searchIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' },
  searchInput: { width: '100%', padding: '12px 12px 12px 45px', borderRadius: '50px', border: '1px solid #e5e7eb', fontSize: '0.95rem', outline: 'none', backgroundColor: '#f9fafb', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  breadcrumbs: { display: 'flex', alignItems: 'center', color: '#6b7280', fontSize: '0.95rem' },
  crumbLink: { textDecoration: 'none', color: '#4b5563', display: 'flex', alignItems: 'center', fontWeight: '500' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap:'20px' },
  
  // BOUTONS D'ACTION
  btnAction: { backgroundColor: 'white', color: '#374151', border: '1px solid #e5e7eb', padding: '10px 20px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  
  btnPrimary: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)' },
  
  btnSecondary: { backgroundColor: 'white', color: '#2563eb', border: '2px solid #2563eb', padding: '8px 18px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' },

  btnDisabled: { backgroundColor: '#9ca3af', padding: '10px 25px', borderRadius: '12px', color: 'white', cursor: 'not-allowed' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '25px', marginBottom: '40px' },
  folderCard: { position: 'relative', backgroundColor: '#fdfdfd', border: '1px solid #f0f0f0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  fileCard: { position: 'relative', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '10px', height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', overflow: 'hidden' },
  folderActions: { position: 'absolute', top: '5px', right: '5px', display: 'flex', gap: '5px', zIndex: 10 },
  topRightActions: { position: 'absolute', top: '5px', right: '5px', display: 'flex', gap: '5px', zIndex: 10 },
  topLeftActions: { position: 'absolute', top: '5px', left: '5px', display: 'flex', gap: '5px', zIndex: 10 },
  miniBtn: { background: 'white', border: '1px solid #f3f4f6', borderRadius: '50%', width: '25px', height: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', fontSize: '0.7rem', color: '#6b7280', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  iconBtn: { background: 'white', border: '1px solid #f3f4f6', borderRadius: '50%', width: '25px', height: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', fontSize: '0.8rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  previewThumb: { width: '100%', height: '90px', objectFit: 'cover', borderRadius: '10px' },
  itemName: { fontSize: '0.85rem', fontWeight: '600', color: '#4b5563', textAlign: 'center', marginTop: '5px', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display:'block' },
  itemDate: { fontSize: '0.7rem', color: '#9ca3af' },
  itemSize: { fontSize: '0.7rem', color: '#2563eb', fontWeight: '600', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px' },
  emptyState: { textAlign: 'center', padding: '50px', color: '#9ca3af', border: '2px dashed #e5e7eb', borderRadius: '20px', width: '100%' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' },
  modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '20px', maxWidth: '90%', maxHeight: '90vh', width: '600px', position: 'relative', display: 'flex', flexDirection: 'column' },
  shareModalContent: { backgroundColor: 'white', padding: '40px', borderRadius: '20px', width: '350px', position: 'relative', display: 'flex', flexDirection: 'column' },
  closeBtn: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' },
  previewArea: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', backgroundColor: '#f9fafb', borderRadius: '12px', padding: '20px', marginBottom: '20px' },
  modalActions: { display: 'flex', justifyContent: 'center', gap: '15px' },
  downloadBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)' },
  shareBtn: { backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)' },
  shareOptionBtn: { border: 'none', padding: '15px', borderRadius: '10px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'center', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }
};
