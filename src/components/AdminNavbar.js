import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// Icônes : On ajoute FaSun, FaMoon pour le thème
import { FaSignOutAlt, FaUserShield, FaArrowLeft, FaChartPie, FaSun, FaMoon, FaGlobe } from 'react-icons/fa';

export default function AdminNavbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // États pour le design
  const [isDarkMode, setIsDarkMode] = useState(true); // Admin commence souvent en sombre par défaut pour le style "Tech"
  const [scrolled, setScrolled] = useState(false);

  // Détection du scroll pour l'effet sticky
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // --- SYSTÈME DE THÈME ---
  const currentTheme = isDarkMode ? styles.dark : styles.light;
  const themeStyles = { ...styles.base, ...currentTheme };

  return (
    <>
      <style>
        {`
          @keyframes slideDown {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .admin-nav-item:hover {
            background-color: ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
            transform: translateY(-2px);
          }
          .gold-glow {
            filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.4));
          }
        `}
      </style>

      <nav 
        style={{
          ...styles.nav,
          backgroundColor: scrolled ? themeStyles.navBgScrolled : themeStyles.navBgTransparent,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: `1px solid ${themeStyles.borderColor}`,
          boxShadow: scrolled ? themeStyles.shadow : 'none',
        }}
      >
        {/* GAUCHE : Logo Admin avec effet Or */}
        <div style={styles.brand}>
          <div style={styles.iconWrapper}>
             <FaUserShield size={22} color="#fbbf24" className="gold-glow"/>
          </div>
          <span style={styles.brandText}>ADMIN<span style={{fontWeight:'400', opacity:0.8}}>PANEL</span></span>
        </div>

        {/* CENTRE : Menu (Vue d'ensemble) */}
        <div style={styles.menu}>
          <span style={{...styles.menuItemActive, color: '#fbbf24', background: isDarkMode ? 'rgba(251, 191, 36, 0.1)' : 'rgba(251, 191, 36, 0.15)'}}>
              <FaChartPie /> <span style={styles.hideOnMobile}>Vue d'ensemble</span>
          </span>
        </div>
        
        {/* DROITE : Actions */}
        <div style={styles.actions}>
          
          {/* Toggle Theme */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            style={{...styles.iconBtn, color: themeStyles.subTextColor}}
            title="Changer le thème"
            className="admin-nav-item"
          >
            {isDarkMode ? <FaSun /> : <FaMoon />}
          </button>

          {/* Lien Retour Dashboard */}
          <Link 
            to="/dashboard" 
            style={{...styles.backLink, color: themeStyles.textColor, borderColor: themeStyles.borderColor}} 
            title="Retourner au site public"
            className="admin-nav-item"
          >
             <FaArrowLeft /> <span style={styles.hideOnMobile}>Retour Site</span>
          </Link>

          <div style={{...styles.separator, backgroundColor: themeStyles.borderColor}}></div>

          {/* Info Admin & Logout */}
          <div style={styles.adminInfo}>
              <span style={{...styles.adminEmail, color: themeStyles.subTextColor}}>{user?.email}</span>
              <button 
                onClick={handleLogout} 
                style={{...styles.logoutBtn, borderColor: themeStyles.borderColor}} 
                title="Se déconnecter"
                className="admin-nav-item"
              >
                  <FaSignOutAlt />
              </button>
          </div>
        </div>
      </nav>
    </>
  );
}

// --- STYLES AVANCÉS ---
const styles = {
  base: {
    transition: 'all 0.3s ease',
  },
  light: {
    navBgTransparent: 'rgba(255, 255, 255, 0.8)',
    navBgScrolled: 'rgba(255, 255, 255, 0.95)',
    textColor: '#1f2937',
    subTextColor: '#6b7280',
    borderColor: 'rgba(0,0,0,0.1)',
    shadow: '0 4px 20px rgba(0,0,0,0.05)',
  },
  dark: {
    navBgTransparent: 'rgba(17, 24, 39, 0.8)', // Fond sombre par défaut
    navBgScrolled: 'rgba(17, 24, 39, 0.95)',
    textColor: '#f3f4f6',
    subTextColor: '#9ca3af',
    borderColor: 'rgba(255,255,255,0.1)',
    shadow: '0 4px 20px rgba(0,0,0,0.3)',
  },

  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 30px',
    height: '70px',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    animation: 'slideDown 0.5s ease-out', // Animation d'entrée
  },

  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '1.3rem',
    fontWeight: '800',
    letterSpacing: '1px',
    cursor: 'default',
  },

  iconWrapper: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    filter: 'drop-shadow(0 0 5px rgba(251, 191, 36, 0.3))'
  },

  brandText: {
    background: 'linear-gradient(90deg, #fbbf24, #d97706)', // Dégradé Or
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },

  menu: {
    display: 'flex',
    gap: '20px',
    position: 'absolute', // Centré absolument
    left: '50%',
    transform: 'translateX(-50%)',
  },

  menuItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 20px',
    borderRadius: '30px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    boxShadow: '0 0 15px rgba(251, 191, 36, 0.1)',
    transition: 'all 0.3s',
  },

  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },

  iconBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.1rem',
    transition: 'all 0.2s',
  },

  backLink: {
    textDecoration: 'none',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '12px',
    border: '1px solid',
    fontWeight: '600',
    transition: 'all 0.2s',
  },

  separator: {
    width: '1px',
    height: '24px',
    margin: '0 5px',
    opacity: 0.5
  },

  adminInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  adminEmail: {
    fontSize: '0.85rem',
    fontWeight: '500',
    maxWidth: '150px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  
  // Cache les éléments textes sur mobile
  hideOnMobile: {
    '@media (max-width: 768px)': {
      display: 'none',
    },
  },

  logoutBtn: {
    background: 'rgba(239, 68, 68, 0.1)', // Rouge très léger
    border: '1px solid',
    padding: '8px',
    borderRadius: '10px',
    color: '#ef4444',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  }
};
