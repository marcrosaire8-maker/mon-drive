import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// Ajout de FaMoon et FaSun pour le toggle, FaHome pour le dashboard explicite
import { FaSignOutAlt, FaUserCircle, FaCog, FaStar, FaUserShield, FaMoon, FaSun, FaHome } from 'react-icons/fa';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Pour savoir sur quelle page on est

  const displayName = user?.user_metadata?.full_name || user?.email;
  const avatarUrl = user?.user_metadata?.avatar_url;

  // État pour le mode sombre (visuel local pour la démo)
  const [isDarkMode, setIsDarkMode] = useState(false);
  // État pour détecter le scroll (pour l'effet glass sticky)
  const [scrolled, setScrolled] = useState(false);

  // Détection du scroll pour modifier l'apparence de la barre
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // --- SYSTÈME DE THÈME DYNAMIQUE ---
  const currentTheme = isDarkMode ? styles.dark : styles.light;
  const themeStyles = { ...styles.base, ...currentTheme };

  return (
    <>
      {/* CSS INJECTÉ POUR LES ANIMATIONS FLUIDES */}
      <style>
        {`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-2px); }
            100% { transform: translateY(0px); }
          }
          .nav-item {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .nav-item:hover {
            transform: scale(1.05);
            background-color: ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
            border-radius: 12px;
          }
          .secret-btn:hover {
            color: #ef4444 !important; /* Devient rouge discret au survol */
            transform: rotate(15deg);
          }
        `}
      </style>

      <nav 
        style={{
          ...styles.nav,
          backgroundColor: scrolled ? themeStyles.navBgScrolled : themeStyles.navBgTransparent,
          borderBottom: scrolled ? `1px solid ${themeStyles.borderColor}` : '1px solid transparent',
          backdropFilter: 'blur(20px) saturate(180%)', // L'effet "Apple" magique
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: scrolled ? themeStyles.shadow : 'none',
        }}
      >
        <div style={styles.leftSection}>
          {/* LOGO - Lien principal */}
          <Link to="/dashboard" style={{...styles.logoLink, color: themeStyles.accentColor}}>
            <span style={{fontSize: '1.8rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'}}>☁️</span> 
            <span style={styles.logoText}>MonDrive</span>
          </Link>
          
          <div style={styles.navLinksContainer}>
            {/* Lien Dashboard Explicite (Demandé) */}
            <Link 
              to="/dashboard" 
              style={{
                ...styles.linkItem, 
                color: location.pathname === '/dashboard' ? themeStyles.accentColor : themeStyles.textColor,
                background: location.pathname === '/dashboard' ? themeStyles.activeBg : 'transparent'
              }}
              className="nav-item"
            >
               <FaHome /> <span style={styles.hideOnMobile}>Dashboard</span>
            </Link>

            {/* Lien Favoris */}
            <Link 
              to="/favorites" 
              style={{
                ...styles.linkItem, 
                color: location.pathname === '/favorites' ? '#fbbf24' : themeStyles.textColor,
                background: location.pathname === '/favorites' ? (isDarkMode ? 'rgba(251, 191, 36, 0.1)' : 'rgba(251, 191, 36, 0.1)') : 'transparent'
              }}
              className="nav-item"
            >
               <FaStar style={{color: '#fbbf24'}}/> <span style={styles.hideOnMobile}>Favoris</span>
            </Link>

            {/* --- LE PASSAGE SECRET --- */}
            <Link 
                to="/admin-login" 
                style={{...styles.secretBtn, color: themeStyles.secretColor}} 
                title="Zone Admin"
                className="secret-btn"
            >
                <FaUserShield />
            </Link>
          </div>
        </div>
        
        <div style={styles.rightSection}>
          
          {/* Toggle Dark Mode */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            style={{...styles.iconBtn, color: isDarkMode ? '#fbbf24' : '#6b7280'}}
            className="nav-item"
            title={isDarkMode ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {isDarkMode ? <FaSun /> : <FaMoon />}
          </button>

          <div style={{...styles.separator, backgroundColor: themeStyles.borderColor}}></div>

          {/* Profil User */}
          <Link to="/profile" style={{...styles.profileInfo, color: themeStyles.textColor}} className="nav-item">
              <span style={{...styles.name, color: themeStyles.textColor}}>{displayName}</span>
              {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{...styles.avatarMini, borderColor: themeStyles.borderColor}} onError={(e) => e.target.style.display = 'none'}/>
              ) : (
                  <FaUserCircle style={{fontSize: '1.8rem', color: themeStyles.subTextColor}}/> 
              )}
          </Link>

          {/* Bouton Paramètres */}
          <Link to="/profile" style={{...styles.iconBtn, color: themeStyles.subTextColor}} title="Paramètres" className="nav-item">
              <FaCog />
          </Link>

          {/* Bouton Logout */}
          <button 
            onClick={handleLogout} 
            style={styles.logoutBtn} 
            title="Se déconnecter"
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.1) rotate(5deg)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1) rotate(0deg)'}
          >
             <FaSignOutAlt />
          </button>
        </div>
      </nav>
    </>
  );
}

// --- SYSTÈME DE STYLES AVANCÉ ---
const styles = {
  base: {
    transition: 'background-color 0.4s ease, color 0.4s ease, border-color 0.4s ease',
  },
  light: {
    navBgTransparent: 'rgba(255, 255, 255, 0.6)', // Très transparent au début
    navBgScrolled: 'rgba(255, 255, 255, 0.85)', // Plus opaque au scroll
    textColor: '#374151',
    subTextColor: '#6b7280',
    borderColor: 'rgba(0, 0, 0, 0.05)',
    accentColor: '#2563eb',
    secretColor: '#f3f4f6', // Presque invisible sur fond clair
    shadow: '0 4px 30px rgba(0, 0, 0, 0.05)',
    activeBg: 'rgba(37, 99, 235, 0.1)',
  },
  dark: {
    navBgTransparent: 'rgba(15, 23, 42, 0.6)',
    navBgScrolled: 'rgba(15, 23, 42, 0.85)',
    textColor: '#f3f4f6',
    subTextColor: '#9ca3af',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    accentColor: '#60a5fa',
    secretColor: '#1e293b', // Sombre sur sombre
    shadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
    activeBg: 'rgba(96, 165, 250, 0.2)',
  },

  nav: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '0 30px', 
    height: '70px', 
    position: 'sticky', // Reste collé en haut
    top: 0, 
    zIndex: 100, // Au-dessus de tout
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', // Animation fluide de la navbar elle-même
  },

  leftSection: { display: 'flex', alignItems: 'center', gap: '30px' },
  
  logoLink: { 
    textDecoration: 'none', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px', 
    fontWeight: '800', 
    letterSpacing: '-0.5px' 
  },
  
  logoText: {
    background: 'linear-gradient(135deg, #2563eb 0%, #a855f7 100%)', // Dégradé sur le texte
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontSize: '1.4rem',
  },

  navLinksContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  linkItem: { 
    textDecoration: 'none', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px', 
    fontWeight: '600', 
    fontSize: '0.95rem', 
    padding: '8px 12px',
    borderRadius: '14px', // Forme "iOS"
    transition: 'all 0.2s',
  },

  // Le bouton secret reste discret mais accessible
  secretBtn: { 
    textDecoration: 'none', 
    fontSize: '1rem', 
    marginLeft: '5px',
    cursor: 'default',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.3s',
    opacity: 0.5
  },

  rightSection: { display: 'flex', alignItems: 'center', gap: '10px' },

  profileInfo: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    textDecoration: 'none', 
    fontWeight: '600', 
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '30px', // Forme pilule
    transition: 'background 0.2s',
  },

  avatarMini: { 
    width: '38px', 
    height: '38px', 
    borderRadius: '50%', 
    objectFit: 'cover', 
    border: '2px solid',
  },

  name: { 
    maxWidth: '120px', 
    whiteSpace: 'nowrap', 
    overflow: 'hidden', 
    textOverflow: 'ellipsis',
    fontSize: '0.9rem',
  },
  
  // Responsive: Cache le texte sur mobile
  hideOnMobile: {
    '@media (max-width: 768px)': {
      display: 'none',
    },
  },

  iconBtn: { 
    fontSize: '1.2rem', 
    padding: '10px', 
    borderRadius: '50%', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    transition: 'all 0.2s',
  },

  logoutBtn: { 
    background: 'none', 
    border: 'none', 
    cursor: 'pointer', 
    color: '#ef4444', 
    fontSize: '1.2rem', 
    display: 'flex', 
    alignItems: 'center', 
    padding: '10px',
    marginLeft: '5px',
    transition: 'transform 0.2s',
  },

  separator: { 
    width: '1px', 
    height: '24px', 
    margin: '0 5px' 
  }
};
