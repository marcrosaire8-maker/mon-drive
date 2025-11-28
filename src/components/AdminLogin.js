import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { FaUserShield, FaLock, FaArrowLeft, FaSun, FaMoon, FaFingerprint } from 'react-icons/fa';

export default function AdminLogin() {
  const emailRef = useRef();
  const passwordRef = useRef();
  
  // États logiques
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // États design
  const [isDarkMode, setIsDarkMode] = useState(true); // Admin commence en mode sombre pour le style "Hacker/Pro"
  const [loaded, setLoaded] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Animation d'entrée
    setTimeout(() => setLoaded(true), 100);
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Connexion Auth
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email: emailRef.current.value,
        password: passwordRef.current.value,
      });

      if (authError || !user) throw new Error("Accès refusé. Identifiants invalides.");

      // 2. Vérification RPC (Security Check)
      const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin');

      if (rpcError || !isAdmin) {
        await supabase.auth.signOut();
        throw new Error("⛔ Violation de protocole. Vous n'êtes pas administrateur.");
      }

      // 3. Succès
      navigate('/admin');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- GESTION DU THÈME ---
  const currentTheme = isDarkMode ? styles.dark : styles.light;
  const themeStyles = { ...styles.base, ...currentTheme };

  return (
    <>
      {/* CSS INJECTÉ POUR ANIMATIONS */}
      <style>
        {`
          @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
          @keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
          @keyframes moveBlob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(60px, -60px) scale(1.1); } 66% { transform: translate(-40px, 40px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
          .input-field:focus {
            border-color: ${isDarkMode ? '#ef4444' : '#2563eb'} !important;
            box-shadow: 0 0 15px ${isDarkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(37, 99, 235, 0.3)'} !important;
            transform: scale(1.02);
          }
          .glass-panel {
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
          }
        `}
      </style>

      <div style={{...styles.pageWrapper, backgroundColor: themeStyles.bgColor}}>
        
        {/* ARRIÈRE-PLAN VIVANT (Blobs) */}
        <div style={{...styles.blob, top: '10%', left: '20%', background: isDarkMode ? '#ef4444' : '#60a5fa', animationDelay: '0s'}}></div>
        <div style={{...styles.blob, bottom: '10%', right: '20%', background: isDarkMode ? '#7f1d1d' : '#a78bfa', animationDelay: '2s'}}></div>

        {/* HEADER NAVIGATION */}
        <nav style={styles.navBar}>
          <Link 
            to="/dashboard" 
            style={{...styles.navLink, color: themeStyles.subText}}
            onMouseEnter={(e) => e.target.style.transform = 'translateX(-5px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateX(0)'}
          >
            <FaArrowLeft /> Retour au Dashboard
          </Link>

          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            style={{...styles.themeToggle, color: themeStyles.text, background: themeStyles.inputBg}}
          >
            {isDarkMode ? <FaSun /> : <FaMoon />}
          </button>
        </nav>

        {/* CARTE DE CONNEXION */}
        <div style={{
            ...styles.card, 
            backgroundColor: themeStyles.cardBg, 
            borderColor: themeStyles.borderColor,
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'translateY(0)' : 'translateY(30px)'
        }} className="glass-panel">
          
          <div style={styles.iconContainer}>
            <div style={{...styles.iconCircle, animation: 'pulseGlow 2s infinite'}}>
              <FaUserShield size={35} color="white" />
            </div>
          </div>
          
          <h2 style={{...styles.title, color: themeStyles.text}}>
            Zone Restreinte
          </h2>
          <p style={{...styles.subtitle, color: themeStyles.subText}}>
            Authentification Admin Requise
          </p>

          {error && (
            <div style={styles.errorBanner}>
              <FaFingerprint size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <input 
                className="input-field"
                type="email" 
                ref={emailRef} 
                placeholder="Identifiant Système" 
                style={{...styles.input, backgroundColor: themeStyles.inputBg, color: themeStyles.text, borderColor: themeStyles.borderColor}} 
                required 
              />
            </div>
            <div style={styles.inputGroup}>
              <input 
                className="input-field"
                type="password" 
                ref={passwordRef} 
                placeholder="Clé de sécurité" 
                style={{...styles.input, backgroundColor: themeStyles.inputBg, color: themeStyles.text, borderColor: themeStyles.borderColor}} 
                required 
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading} 
              style={{
                ...styles.button,
                background: isDarkMode ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                opacity: loading ? 0.7 : 1
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.03)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              {loading ? "Décryptage..." : "Accéder au Terminal"} <FaLock size={14} />
            </button>
          </form>

          <div style={styles.footer}>
            <span style={{color: themeStyles.subText, fontSize: '0.75rem', display:'flex', alignItems:'center', gap:'5px', justifyContent:'center'}}>
               <FaLock size={10}/> Connexion chiffrée de bout en bout
            </span>
          </div>
        </div>

      </div>
    </>
  );
}

// --- SYSTÈME DE STYLES ---
const styles = {
  base: { transition: 'all 0.4s ease' },
  light: {
    bgColor: '#f3f4f6',
    cardBg: 'rgba(255, 255, 255, 0.65)',
    inputBg: 'rgba(255, 255, 255, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    text: '#1f2937',
    subText: '#6b7280',
  },
  dark: {
    bgColor: '#0f172a', // Très sombre
    cardBg: 'rgba(30, 41, 59, 0.6)', // Glass sombre
    inputBg: 'rgba(15, 23, 42, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    text: '#f3f4f6',
    subText: '#9ca3af',
  },

  pageWrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },

  blob: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(90px)',
    opacity: 0.5,
    width: '400px',
    height: '400px',
    animation: 'moveBlob 15s infinite alternate',
    zIndex: 0,
  },

  navBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    padding: '20px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },

  navLink: {
    textDecoration: 'none',
    display: 'flex', alignItems: 'center', gap: '8px',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    backdropFilter: 'blur(5px)',
    padding: '8px 15px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)'
  },

  themeToggle: {
    border: 'none',
    borderRadius: '50%',
    width: '40px', height: '40px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(5px)',
    transition: 'transform 0.2s',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
  },

  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '40px',
    borderRadius: '24px',
    borderWidth: '1px',
    borderStyle: 'solid',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
    position: 'relative',
    zIndex: 1,
    transition: 'transform 0.5s ease-out, opacity 0.5s ease-out',
  },

  iconContainer: {
    position: 'absolute',
    top: '-40px',
    left: '50%',
    transform: 'translateX(-50%)',
  },

  iconCircle: {
    backgroundColor: '#ef4444', // Rouge Alerte pour Admin
    width: '80px', height: '80px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 10px 25px rgba(239, 68, 68, 0.5)',
    border: '4px solid rgba(255,255,255,0.1)',
  },

  title: {
    fontSize: '2rem',
    fontWeight: '800',
    marginBottom: '5px',
    marginTop: '30px',
    letterSpacing: '-0.5px',
  },
  
  subtitle: {
    fontSize: '0.95rem',
    marginBottom: '30px',
    fontWeight: '500',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },

  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    padding: '12px',
    borderRadius: '12px',
    marginBottom: '20px',
    fontSize: '0.85rem',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', fontWeight: '600'
  },

  form: { display: 'flex', flexDirection: 'column', gap: '20px' },

  inputGroup: { position: 'relative' },
  
  input: {
    width: '100%',
    padding: '16px 20px',
    borderRadius: '14px',
    fontSize: '1rem',
    outline: 'none',
    borderWidth: '1px',
    borderStyle: 'solid',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    fontWeight: '500',
  },

  button: {
    width: '100%',
    padding: '16px',
    border: 'none',
    borderRadius: '14px',
    color: 'white',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    transition: 'all 0.2s',
    boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.3)',
    marginTop: '10px'
  },

  footer: {
    marginTop: '30px',
    opacity: 0.7
  }
};
