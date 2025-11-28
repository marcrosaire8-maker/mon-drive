import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import Navbar from './Navbar';
import { Link } from 'react-router-dom';
import { FcCompactCamera, FcSafe, FcManager, FcBusinessContact } from "react-icons/fc"; 
import { FaArrowLeft, FaMoon, FaSun, FaSave, FaUserEdit, FaShieldAlt } from 'react-icons/fa';

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
  // État pour l'animation d'entrée
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true); // Déclenche l'animation
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

  // --- LOGIQUE BACKEND CORRIGÉE ---
  async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const instantUrl = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(instantUrl);
      setMessage("📸 Photo chargée ! Pense à sauvegarder.");
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
      
      // CORRECTION : J'ai retiré 'updated_at' qui causait ton erreur rouge
      const updates = { 
          first_name: firstName, 
          last_name: lastName, 
          full_name: fullNameCombined, 
          avatar_url: avatarUrl 
          // updated_at: new Date() <--- Ligne supprimée pour éviter le crash
      };
      
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: fullNameCombined, avatar_url: avatarUrl } });
      
      setMessage("✨ Profil mis à jour avec succès !");
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
      
      {/* CSS INJECTÉ POUR LES ANIMATIONS "FOU MALADES" */}
      <style>
        {`
          @keyframes floatBlob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(50px, -50px) scale(1.1); }
            66% { transform: translate(-30px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-blob {
            animation: floatBlob 10s infinite alternate cubic-bezier(0.4, 0, 0.2, 1);
          }
          .glass-card-enter {
            animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .input-animated:focus {
            transform: scale(1.02);
            box-shadow: 0 0 0 4px ${isDarkMode ? 'rgba(96, 165, 250, 0.3)' : 'rgba(59, 130, 246, 0.2)'};
          }
        `}
      </style>

      <div style={{...styles.pageWrapper, backgroundColor: themeStyles.bgColor}}>
        
        {/* ARRIÈRE-PLAN VIVANT (PARALLAXE) */}
        <div className="animate-blob" style={{...styles.blob, top: '10%', left: '5%', backgroundColor: '#60a5fa', animationDelay: '0s'}}></div>
        <div className="animate-blob" style={{...styles.blob, bottom: '15%', right: '10%', backgroundColor: '#a78bfa', animationDelay: '2s'}}></div>
        <div className="animate-blob" style={{...styles.blob, top: '40%', left: '40%', backgroundColor: '#f472b6', width: '250px', height: '250px', animationDelay: '4s', opacity: 0.4}}></div>

        {/* CARTE PRINCIPALE EN VERRE (GLASSMORPHISM) */}
        <div className="glass-card-enter" style={{...styles.glassCard, backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor}}>
          
          {/* HEADER : Retour & Thème */}
          <div style={styles.headerRow}>
            <Link 
              to="/dashboard" 
              style={{...styles.backLink, color: themeStyles.subTextColor}}
              onMouseEnter={(e) => e.target.style.transform = 'translateX(-5px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateX(0)'}
            >
              <div style={styles.iconCircle}><FaArrowLeft /></div>
              <span>Dashboard</span>
            </Link>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              style={{...styles.themeToggle, backgroundColor: isDarkMode ? '#374151' : '#e5e7eb'}}
              title="Changer le thème"
            >
              {isDarkMode ? <FaSun color="#fbbf24" /> : <FaMoon color="#4b5563" />}
            </button>
          </div>

          <h1 style={{...styles.title, color: themeStyles.textColor}}>
            Mon Profil
          </h1>

          {/* SECTION AVATAR AVEC EFFET GLOW */}
          <div style={styles.avatarContainer}>
            <div style={{...styles.avatarRing, borderColor: themeStyles.accentColor, boxShadow: `0 0 30px ${themeStyles.accentColor}40`}}>
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Profile" 
                  style={styles.avatarImg}
                  onError={(e) => e.target.style.display = 'none'} 
                />
              ) : (
                <div style={{...styles.avatarPlaceholder, backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6'}}>
                   <FcManager size={70} />
                </div>
              )}
              
              <label style={styles.cameraBtn}>
                <FcCompactCamera size={22} />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{display:'none'}} />
              </label>
            </div>
          </div>

          {/* MESSAGE ALERT */}
          {message && (
            <div style={{
              ...styles.alert, 
              backgroundColor: message.includes('Erreur') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: message.includes('Erreur') ? '#ef4444' : '#10b981',
              border: `1px solid ${message.includes('Erreur') ? '#ef4444' : '#10b981'}`
            }}>
              {message}
            </div>
          )}

          {/* FORMULAIRE INFOS */}
          <div style={styles.formSection}>
            <div style={styles.row}>
                <div style={styles.formGroup}>
                    <label style={{...styles.label, color: themeStyles.textColor}}>Prénom</label>
                    <input 
                        className="input-animated"
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
                        className="input-animated"
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
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-3px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {loading ? "Sauvegarde..." : <><FaSave /> Enregistrer les modifications</>}
            </button>

            <div style={{...styles.divider, backgroundColor: themeStyles.borderColor}}></div>

            <h3 style={{...styles.subTitle, color: themeStyles.textColor}}>
              <FaShieldAlt style={{marginRight: '10px', color: isDarkMode ? '#fbbf24' : '#f59e0b'}} /> Sécurité
            </h3>

            <div style={styles.formGroup}>
              <label style={{...styles.label, color: themeStyles.textColor}}>Nouveau mot de passe</label>
              <input 
                className="input-animated"
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

// --- SYSTÈME DE STYLES PREMIUM ---
const styles = {
  // Thèmes
  light: {
    bgColor: '#f0f4f8',
    cardBg: 'rgba(255, 255, 255, 0.7)', // Transparence pour le flou
    textColor: '#1e293b',
    subTextColor: '#64748b',
    inputBg: 'rgba(255, 255, 255, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    accentColor: '#3b82f6',
  },
  dark: {
    bgColor: '#0f172a',
    cardBg: 'rgba(30, 41, 59, 0.6)', // Sombre et transparent
    textColor: '#f1f5f9',
    subTextColor: '#94a3b8',
    inputBg: 'rgba(15, 23, 42, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    accentColor: '#60a5fa',
  },
  base: {
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  },

  pageWrapper: {
    minHeight: '100vh',
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    overflow: 'hidden',
  },
  
  // Les cercles flous en arrière-plan
  blob: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(80px)',
    width: '350px',
    height: '350px',
    zIndex: 0,
    willChange: 'transform',
  },

  glassCard: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: '450px',
    backdropFilter: 'blur(24px) saturate(180%)', // LE SECRET APPLE : Blur + Saturation
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    borderRadius: '30px',
    borderWidth: '1px',
    borderStyle: 'solid',
    padding: '40px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },

  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  
  backLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.9rem',
    transition: 'transform 0.2s',
    cursor: 'pointer',
  },
  
  iconCircle: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', 
    width: '36px', height: '36px', borderRadius: '50%', 
    backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
  },

  themeToggle: {
    border: 'none', borderRadius: '20px', padding: '10px 14px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.3s ease', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  },

  title: {
    textAlign: 'center', fontSize: '2.2rem', fontWeight: '800', 
    marginBottom: '40px', letterSpacing: '-1px',
    textShadow: '0 2px 10px rgba(0,0,0,0.05)'
  },

  avatarContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' },
  
  avatarRing: {
    position: 'relative', padding: '6px', borderRadius: '50%', 
    border: '2px dashed', cursor: 'pointer', 
    transition: 'all 0.3s ease',
  },

  avatarImg: { width: '130px', height: '130px', borderRadius: '50%', objectFit: 'cover' },
  avatarPlaceholder: { width: '130px', height: '130px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  cameraBtn: {
    position: 'absolute', bottom: '5px', right: '5px',
    backgroundColor: 'white', width: '40px', height: '40px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)', cursor: 'pointer',
    transition: 'transform 0.2s', color: '#1f2937'
  },

  alert: {
    padding: '15px', borderRadius: '16px', textAlign: 'center', fontSize: '0.9rem', 
    fontWeight: '600', marginBottom: '25px', backdropFilter: 'blur(10px)',
  },

  formSection: { display: 'flex', flexDirection: 'column', gap: '20px' },
  row: { display: 'flex', gap: '15px' },
  formGroup: { marginBottom: '5px', flex: 1 },

  label: {
    display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '700', marginLeft: '8px', opacity: 0.9
  },

  input: {
    width: '100%', padding: '16px 20px', borderRadius: '18px',
    borderWidth: '1px', borderStyle: 'solid', fontSize: '1rem', outline: 'none',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxSizing: 'border-box', fontWeight: '500'
  },

  btnPrimary: {
    width: '100%', padding: '18px', border: 'none', borderRadius: '18px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white', fontSize: '1rem', fontWeight: '700', cursor: 'pointer',
    marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
  },

  divider: { height: '1px', width: '100%', margin: '10px 0', opacity: 0.3 },

  subTitle: { fontSize: '1.2rem', fontWeight: '700', display: 'flex', alignItems: 'center', marginBottom: '5px' },

  btnSecondary: {
    width: '100%', padding: '16px', border: 'none', borderRadius: '18px',
    backgroundColor: '#475569', color: 'white', fontWeight: '600', cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
