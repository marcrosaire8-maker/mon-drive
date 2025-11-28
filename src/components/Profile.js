import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import Navbar from './Navbar';
import { Link } from 'react-router-dom';
// Ajout des icônes pour le mode sombre/clair
import { FcCompactCamera, FcSafe, FcManager } from "react-icons/fc"; 
import { FaArrowLeft, FaMoon, FaSun, FaSave } from 'react-icons/fa';

export default function Profile() {
  const { user } = useAuth();
  
  // États de données
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  
  // État pour le thème (false = Clair, true = Sombre)
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    async function getProfile() {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('first_name, last_name, avatar_url').eq('id', user.id).single();
      if (data) {
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setAvatarUrl(data.avatar_url || '');
      }
    }
    getProfile();
  }, [user]);

  // --- LOGIQUE BACKEND (Inchangée mais optimisée visuellement) ---
  async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('avatars').getPublicUrl(fileName);
      const instantUrl = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(instantUrl);
      setMessage("📸 Photo chargée ! Pensez à sauvegarder.");
    } catch (error) {
      alert("Erreur upload: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setLoading(true);
      const fullNameCombined = `${firstName} ${lastName}`.trim();
      const updates = { first_name: firstName, last_name: lastName, full_name: fullNameCombined, avatar_url: avatarUrl, updated_at: new Date() };
      
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: fullNameCombined, avatar_url: avatarUrl } });
      
      setMessage("✨ Profil mis à jour avec élégance !");
      setTimeout(() => window.location.reload(), 1500); 
    } catch (error) {
      setMessage("❌ Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updatePassword() {
    if (!password) return;
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;
      setMessage("🔒 Sécurité renforcée avec succès !");
      setPassword('');
    } catch (error) {
      setMessage("❌ Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- GESTION DES STYLES DYNAMIQUES ---
  const currentTheme = isDarkMode ? styles.dark : styles.light;
  const themeStyles = { ...styles.base, ...currentTheme };

  return (
    <>
      <Navbar />
      
      {/* Injection de CSS pour les animations complexes (Background mouvant) */}
      <style>
        {`
          @keyframes moveBlob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob {
            animation: moveBlob 10s infinite alternate;
          }
          .input-focus:focus {
            transform: scale(1.02);
            box-shadow: 0 0 0 4px ${isDarkMode ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.2)'};
          }
        `}
      </style>

      <div style={{...styles.pageWrapper, backgroundColor: themeStyles.bgColor}}>
        
        {/* Cercles d'arrière-plan animés (Effet "Lava lamp") */}
        <div style={{...styles.blob, top: '10%', left: '10%', backgroundColor: '#60a5fa', animationDelay: '0s'}}></div>
        <div style={{...styles.blob, bottom: '20%', right: '10%', backgroundColor: '#a78bfa', animationDelay: '2s'}}></div>
        <div style={{...styles.blob, top: '40%', left: '40%', backgroundColor: '#f472b6', width: '200px', height: '200px', animationDelay: '4s'}}></div>

        {/* Carte Principale "Glassmorphism" */}
        <div style={{...styles.glassCard, backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor}}>
          
          {/* Header de la carte : Retour & Toggle Mode */}
          <div style={styles.headerRow}>
            <Link to="/dashboard" style={{...styles.backLink, color: themeStyles.subTextColor}}>
              <div style={styles.iconCircle}><FaArrowLeft /></div>
              <span>Dashboard</span>
            </Link>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              style={{...styles.themeToggle, backgroundColor: isDarkMode ? '#374151' : '#e5e7eb'}}
            >
              {isDarkMode ? <FaSun color="#fbbf24" /> : <FaMoon color="#4b5563" />}
            </button>
          </div>

          <h2 style={{...styles.title, color: themeStyles.textColor}}>
            Mon Espace
          </h2>

          {/* Section Avatar */}
          <div style={styles.avatarContainer}>
            <div style={{...styles.avatarRing, borderColor: themeStyles.accentColor}}>
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Profile" 
                  style={styles.avatarImg}
                  onError={(e) => e.target.style.display = 'none'} 
                />
              ) : (
                <div style={{...styles.avatarPlaceholder, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6'}}>
                   <FcManager size={60} />
                </div>
              )}
              
              <label style={styles.cameraBtn}>
                <FcCompactCamera size={20} />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{display:'none'}} />
              </label>
            </div>
            <p style={{marginTop: '15px', color: themeStyles.subTextColor, fontSize: '0.9rem'}}>Modifier la photo</p>
          </div>

          {/* Alert Message */}
          {message && (
            <div style={{
              ...styles.alert, 
              backgroundColor: message.includes('Erreur') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: message.includes('Erreur') ? '#ef4444' : '#10b981',
              border: `1px solid ${message.includes('Erreur') ? '#ef4444' : '#10b981'}`
            }}>
              {message}
            </div>
          )}

          {/* Formulaire */}
          <div style={styles.formSection}>
            <div style={styles.row}>
                <div style={styles.formGroup}>
                    <label style={{...styles.label, color: themeStyles.textColor}}>Prénom</label>
                    <input 
                        className="input-focus"
                        type="text" 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        placeholder="Jean"
                        style={{...styles.input, backgroundColor: themeStyles.inputBg, color: themeStyles.textColor, borderColor: themeStyles.borderColor}}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={{...styles.label, color: themeStyles.textColor}}>Nom</label>
                    <input 
                        className="input-focus"
                        type="text" 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)} 
                        placeholder="Dupont"
                        style={{...styles.input, backgroundColor: themeStyles.inputBg, color: themeStyles.textColor, borderColor: themeStyles.borderColor}}
                    />
                </div>
            </div>

            <button 
              onClick={updateProfile} 
              disabled={loading} 
              style={{...styles.btnPrimary, opacity: loading ? 0.7 : 1}}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <FaSave style={{marginRight: '8px'}} /> Sauvegarder
            </button>

            <div style={{...styles.divider, backgroundColor: themeStyles.borderColor}}></div>

            <h3 style={{...styles.subTitle, color: themeStyles.textColor}}>
              <FcSafe style={{marginRight: '10px'}} /> Sécurité
            </h3>

            <div style={styles.formGroup}>
              <label style={{...styles.label, color: themeStyles.textColor}}>Nouveau mot de passe</label>
              <input 
                className="input-focus"
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                style={{...styles.input, backgroundColor: themeStyles.inputBg, color: themeStyles.textColor, borderColor: themeStyles.borderColor}}
              />
            </div>

            <button 
              onClick={updatePassword} 
              disabled={loading || !password} 
              style={{...styles.btnSecondary, opacity: (!password || loading) ? 0.5 : 1}}
            >
              Mettre à jour le mot de passe
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

// --- SYSTÈME DE STYLES AVANCÉ ---
const styles = {
  // Styles de base structurels
  base: {},
  
  // Thèmes de couleurs
  light: {
    bgColor: '#f3f4f6',
    cardBg: 'rgba(255, 255, 255, 0.75)', // Glassmorphism clair
    textColor: '#111827',
    subTextColor: '#6b7280',
    inputBg: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    accentColor: '#3b82f6',
  },
  dark: {
    bgColor: '#0f172a',
    cardBg: 'rgba(30, 41, 59, 0.70)', // Glassmorphism sombre
    textColor: '#f9fafb',
    subTextColor: '#9ca3af',
    inputBg: 'rgba(15, 23, 42, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    accentColor: '#60a5fa',
  },

  // Layout et composants
  pageWrapper: {
    minHeight: '100vh',
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    overflow: 'hidden', // Important pour les bulles qui bougent
    transition: 'background-color 0.5s ease',
  },
  
  // Les "Blobs" d'arrière-plan
  blob: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(50px)',
    opacity: 0.6,
    width: '300px',
    height: '300px',
    zIndex: 0,
    animation: 'moveBlob 15s infinite alternate', // Utilise les keyframes CSS injectés
  },

  glassCard: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '420px',
    backdropFilter: 'blur(20px)', // LE SECRET DE L'EFFET APPLE
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '24px',
    border: '1px solid',
    padding: '40px 30px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.5s ease',
  },

  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  
  backLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '0.9rem',
    transition: 'opacity 0.2s',
  },
  
  iconCircle: {
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    width: '32px', 
    height: '32px', 
    borderRadius: '50%', 
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  themeToggle: {
    border: 'none',
    borderRadius: '20px',
    padding: '8px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  },

  title: {
    textAlign: 'center',
    fontSize: '1.8rem',
    fontWeight: '800',
    marginBottom: '30px',
    letterSpacing: '-0.5px', // Style typographique moderne
  },

  avatarContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '30px',
  },
  
  avatarRing: {
    position: 'relative',
    padding: '5px',
    borderRadius: '50%',
    border: '2px dashed',
    cursor: 'pointer',
    transition: 'transform 0.3s ease',
  },

  avatarImg: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    objectFit: 'cover',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  
  avatarPlaceholder: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cameraBtn: {
    position: 'absolute',
    bottom: '5px',
    right: '5px',
    backgroundColor: 'white',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },

  alert: {
    padding: '12px',
    borderRadius: '12px',
    textAlign: 'center',
    fontSize: '0.9rem',
    fontWeight: '600',
    marginBottom: '20px',
    backdropFilter: 'blur(5px)',
  },

  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  
  row: {
    display: 'flex',
    gap: '15px',
  },

  formGroup: {
    marginBottom: '5px',
    flex: 1,
  },

  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    marginLeft: '5px',
  },

  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '14px', // Coins très arrondis style iOS
    border: '1px solid',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
  },

  btnPrimary: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', // Dégradé bleu Apple
    color: 'white',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)',
  },

  divider: {
    height: '1px',
    width: '100%',
    margin: '20px 0',
    opacity: 0.3,
  },

  subTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
  },

  btnSecondary: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '14px',
    backgroundColor: '#4b5563',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
};
