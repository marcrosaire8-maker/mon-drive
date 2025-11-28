import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import Navbar from './Navbar';
import { FcFile, FcImageFile, FcMusic, FcDocument } from "react-icons/fc";
import { FaTimes, FaDownload, FaStar, FaTrash } from 'react-icons/fa';

export default function Favorites() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    if (user) fetchFavorites();
  }, [user]);

  async function fetchFavorites() {
    try {
      setLoading(true);
      // On récupère SEULEMENT les fichiers où is_favorite est TRUE
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_favorite', true) // <--- Le filtre magique
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // Fonction pour retirer des favoris depuis cette page
  const removeFavorite = async (e, file) => {
    e.stopPropagation();
    if(!window.confirm("Retirer des favoris ?")) return;
    
    await supabase.from('files').update({ is_favorite: false }).eq('id', file.id);
    // On le retire de la liste visuelle
    setFiles(files.filter(f => f.id !== file.id));
  };

  const getFileIcon = (mimeType, size = 40) => {
    if (!mimeType) return <FcFile size={size}/>;
    if (mimeType.includes('image')) return <FcImageFile size={size}/>;
    if (mimeType.includes('pdf')) return <FcDocument size={size}/>;
    if (mimeType.includes('audio')) return <FcMusic size={size}/>;
    return <FcFile size={size}/>;
  };

  return (
    <>
      <Navbar />
      <div style={styles.container}>
        <h2 style={{color: '#fbbf24', display:'flex', alignItems:'center', gap:'10px'}}>
            <FaStar /> Mes Favoris
        </h2>
        <p style={{color:'#6b7280', marginBottom:'30px'}}>Vos fichiers importants en accès rapide.</p>

        {loading ? <p>Chargement...</p> : (
          <div style={styles.grid}>
            {files.map(file => (
              <div key={file.id} style={styles.fileCard} onClick={() => setPreviewFile(file)}>
                
                {/* Bouton pour retirer des favoris (Croix ou Étoile pleine) */}
                <button style={styles.removeBtn} onClick={(e) => removeFavorite(e, file)} title="Retirer">
                  <FaTimes />
                </button>

                {file.type.includes('image') ? (
                   <img src={file.url} alt={file.name} style={styles.previewThumb} />
                ) : (
                   getFileIcon(file.type, 60)
                )}
                <span style={styles.itemName}>{file.name}</span>
              </div>
            ))}
          </div>
        )}
        
        {!loading && files.length === 0 && (
            <div style={styles.emptyState}>
                Vous n'avez aucun favori pour l'instant. <br/>
                Ajoutez une étoile ⭐ depuis le Dashboard !
            </div>
        )}

        {/* MODALE SIMPLE (Même que Dashboard) */}
        {previewFile && (
            <div style={styles.modalOverlay} onClick={() => setPreviewFile(null)}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                <img src={previewFile.url} style={{maxWidth:'100%', maxHeight:'80vh', borderRadius:'10px'}} alt="Preview"/>
            </div>
            </div>
        )}
      </div>
    </>
  );
}

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '25px', marginBottom: '40px' },
  fileCard: { position: 'relative', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '10px', height: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', overflow: 'hidden' },
  removeBtn: { position: 'absolute', top: '5px', right: '5px', background: 'white', border: '1px solid #fee2e2', borderRadius: '50%', width: '25px', height: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem', zIndex: 10 },
  previewThumb: { width: '100%', height: '100px', objectFit: 'cover', borderRadius: '10px' },
  itemName: { fontSize: '0.85rem', fontWeight: '600', color: '#4b5563', textAlign: 'center', marginTop: '10px', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  emptyState: { textAlign: 'center', padding: '50px', color: '#9ca3af', border: '2px dashed #e5e7eb', borderRadius: '20px', width: '100%' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'transparent', padding: '0', maxWidth: '90%' }
};
