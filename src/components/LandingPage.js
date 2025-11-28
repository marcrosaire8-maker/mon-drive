import React, { useState } from 'react';
import { 
  FaArrowRight, FaCloud, FaShieldAlt, FaMoon, FaSun, FaDatabase, FaLock, FaShareAlt 
} from 'react-icons/fa';
import { 
  FiFileText, FiImage, FiMusic, FiVideo, FiFolder, FiHardDrive, FiCast, FiActivity 
} from 'react-icons/fi';
import { BiImages, BiSupport } from 'react-icons/bi';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';

// --- Composants Utilitaires pour les éléments flottants ---

// Petit conteneur pour une icône flottante
const FloatingIcon = ({ icon, color, bg, top, left, delay, theme }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: 1, 
      scale: 1,
      y: [0, -15, 0],
      rotate: [0, 5, -5, 0]
    }}
    transition={{ 
      opacity: { delay, duration: 0.5 },
      scale: { delay, duration: 0.5 },
      y: { duration: 3 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" },
      rotate: { duration: 5 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" }
    }}
    style={{
      position: 'absolute',
      top, left,
      padding: '12px',
      borderRadius: '12px',
      backgroundColor: bg || theme.cardBg,
      color: color || theme.text,
      boxShadow: `0 10px 20px -5px ${theme.shadowColor}`,
      border: `1px solid ${theme.border}`,
      backdropFilter: 'blur(5px)',
      zIndex: 2,
    }}
  >
    {icon}
  </motion.div>
);

// Petit conteneur pour une image miniature flottante
const FloatingImg = ({ src, top, left, delay, theme, rotateStr }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, rotate: rotateStr || '-5deg' }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        y: [0, -10, 0],
      }}
      transition={{ 
        opacity: { delay, duration: 0.6 },
        scale: { delay, duration: 0.6, type: "spring" },
        y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
      }}
      style={{
        position: 'absolute',
        top, left,
        width: '80px',
        height: '80px',
        borderRadius: '16px',
        overflow: 'hidden',
        border: `2px solid #ffffff`,
        boxShadow: `0 15px 30px -10px ${theme.shadowColor}`,
        zIndex: 1,
      }}
    >
      <img src={src} alt="miniature" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </motion.div>
  );


function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const toggleTheme = () => setDarkMode(!darkMode);

  const { scrollY } = useScroll();
  const yHeroText = useTransform(scrollY, [0, 500], [0, 150]);
  // Le nuage d'icônes bouge plus vite pour un effet de profondeur accru
  const yHeroCloud = useTransform(scrollY, [0, 500], [0, -250]); 
  
  const theme = darkMode ? styles.dark : styles.light;

  return (
    <div style={{ ...styles.container, backgroundColor: theme.bg, color: theme.text }}>
      
      {/* --- Background Ambiant --- */}
      <div style={styles.ambientBackground}>
        <motion.div 
          animate={{ x: [0, 150, 0], y: [0, -100, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          style={{ ...styles.blob, backgroundColor: theme.blob1, top: '-20%', left: '-10%' }} 
        />
        <motion.div 
          animate={{ x: [0, -150, 0], y: [0, 150, 0], scale: [1, 1.4, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{ ...styles.blob, backgroundColor: theme.blob2, bottom: '-10%', right: '-20%' }} 
        />
      </div>

      {/* --- Navbar --- */}
      <motion.nav 
        initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ ...styles.navbar, backgroundColor: theme.navBg, borderColor: theme.border }}
      >
        <div style={styles.logoContainer}>
          <FaCloud style={{ color: theme.accent, fontSize: '1.5rem' }} />
          <span style={styles.logoText}>MonDrive</span>
        </div>
        <div style={styles.navActions}>
          <button onClick={toggleTheme} style={{...styles.iconButton, color: theme.text}}>
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
          {user ? (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/dashboard')} style={styles.navButtonPrimary}>Mon Espace</motion.button>
          ) : (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/signup')} style={{ ...styles.navButtonSecondary, borderColor: theme.accent, color: theme.accent }}>Se connecter</motion.button>
          )}
        </div>
      </motion.nav>

      {/* --- Header Section Redesigned --- */}
      <header style={styles.heroSection}>
        <motion.div style={{ ...styles.heroContent, y: yHeroText }}>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} style={styles.title}>
            Votre univers numérique. <br />
            <span style={{...styles.highlight, backgroundImage: theme.gradient}}>Centralisé & Sécurisé.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} style={{ ...styles.subtitle, color: theme.subtext }}>
            Ne perdez plus jamais un fichier. Photos, documents, projets : tout est là, chiffré et accessible instantanément.
          </motion.p>
          {!user && (
            <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.05, boxShadow: `0 10px 25px ${theme.accent}60` }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.5, delay: 0.4 }} onClick={() => navigate('/signup')} style={{...styles.mainButton, backgroundImage: theme.buttonGradient}}>
              Commencer maintenant <FaArrowRight style={{ marginLeft: '10px' }} />
            </motion.button>
          )}
        </motion.div>

        {/* --- Le "Nuage" d'éléments flottants (Remplace l'image unique) --- */}
        <motion.div style={{ ...styles.heroCloudWrapper, y: yHeroCloud }}>
           <div style={styles.cloudContainer}>
              {/* Couche 1 : Icônes de types de fichiers */}
              <FloatingIcon icon={<FiFileText size={24}/>} color="#fff" bg="#3b82f6" top="10%" left="15%" delay={0.5} theme={theme} />
              <FloatingIcon icon={<FiImage size={24}/>} color="#fff" bg="#ec4899" top="30%" left="60%" delay={0.6} theme={theme} />
              <FloatingIcon icon={<FiMusic size={24}/>} color="#fff" bg="#8b5cf6" top="70%" left="20%" delay={0.7} theme={theme} />
              <FloatingIcon icon={<FiVideo size={24}/>} color="#fff" bg="#f59e0b" top="50%" left="80%" delay={0.8} theme={theme} />
              
              {/* Couche 2 : Icônes système/sécurité */}
              <FloatingIcon icon={<FaDatabase size={20}/>} top="5%" left="70%" delay={0.9} theme={theme} />
              <FloatingIcon icon={<FaLock size={20}/>} top="80%" left="65%" delay={1.0} theme={theme} />
              <FloatingIcon icon={<FiHardDrive size={20}/>} top="40%" left="5%" delay={1.1} theme={theme} />

              {/* Couche 3 : Miniatures d'images */}
              <FloatingImg src="https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=200&q=80" top="20%" left="40%" delay={0.6} theme={theme} rotateStr="10deg" />
              <FloatingImg src="https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=200&q=80" top="60%" left="45%" delay={0.8} theme={theme} rotateStr="-8deg" />
              <FloatingImg src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=200&q=80" top="85%" left="10%" delay={1.2} theme={theme} rotateStr="15deg" />
              
              {/* Élément central brillant */}
              <motion.div
                 animate={{ scale: [1, 1.1, 1] }}
                 transition={{ duration: 3, repeat: Infinity }}
                 style={{
                   position: 'absolute', top: '45%', left: '40%',
                   width: '120px', height: '120px', borderRadius: '50%',
                   background: theme.gradient, filter: 'blur(30px)', opacity: 0.4, zIndex: 0
                 }}
              />
           </div>
        </motion.div>
      </header>

      {/* --- Bento Grid Features (Enrichi visuellement) --- */}
      <section style={styles.featuresSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Tout y est. En mieux.</h2>
        </div>

        <div style={styles.bentoGrid}>
          {/* Card 1: Large Security Focus */}
          <FeatureCard colSpan={2} theme={theme} delay={0.2}>
             <div style={styles.cardContentPadded}>
               <div style={styles.cardHeaderRow}>
                 <div style={{...styles.iconBoxBig, backgroundColor: theme.accent + '20', color: theme.accent}}><FaShieldAlt /></div>
                 <h3 style={styles.cardTitle}>Sécurité RLS Impénétrable</h3>
               </div>
               <p style={{ ...styles.cardDesc, color: theme.subtext }}>Technologie de chiffrement Row-Level Security. Vos données sont verrouillées au niveau de la base de données. Même nous ne pouvons pas les voir.</p>
               {/* Ajout d'une illustration d'icônes dans la carte */}
               <div style={styles.securityIconsVisualization}>
                  <FaLock style={{color: theme.subtext, fontSize:'1.2rem', margin: '0 10px'}} />
                  <span style={{color: theme.border}}>••••••••••••••</span>
                  <FaDatabase style={{color: theme.accent, fontSize:'1.5rem', margin: '0 10px'}} />
               </div>
             </div>
             <img src="https://images.unsplash.com/photo-1633265486064-086b219458ec?auto=format&fit=crop&w=800&q=80" alt="Security" style={styles.cardImageOverlay} />
          </FeatureCard>
          
          {/* Card 2: Organization Visualization */}
          <FeatureCard theme={theme} delay={0.4} style={{ overflow: 'visible' }}>
             <div style={styles.cardContentPadded}>
                <div style={{...styles.iconBox, backgroundColor: '#10b98120', color: '#10b981'}}><FiFolder /></div>
                <h3 style={styles.cardTitle}>Organisation Zen</h3>
                <p style={{ ...styles.cardDesc, color: theme.subtext }}>Glissez, déposez, classez. Une structure infinie.</p>
                {/* Mini structure de dossiers visuelle */}
                <div style={{ marginTop: '20px', position: 'relative', height: '80px' }}>
                   <FloatingIcon icon={<FiFolder size={18}/>} color="#10b981" bg={theme.bg} top="0" left="10%" delay={0.5} theme={theme} />
                   <FloatingIcon icon={<FiFileText size={14}/>} color={theme.subtext} bg={theme.bg} top="40px" left="30%" delay={0.6} theme={theme} />
                   <FloatingIcon icon={<FiImage size={14}/>} color={theme.subtext} bg={theme.bg} top="30px" left="60%" delay={0.7} theme={theme} />
                </div>
             </div>
          </FeatureCard>

          {/* Card 3: Media Gallery */}
          <FeatureCard theme={theme} delay={0.6}>
             <div style={styles.cardContentPadded}>
                <div style={{...styles.iconBox, backgroundColor: '#f59e0b20', color: '#f59e0b'}}><BiImages /></div>
                <h3 style={styles.cardTitle}>Galerie Immersive</h3>
                <p style={{ ...styles.cardDesc, color: theme.subtext }}>Vos souvenirs méritent le plus bel écrin.</p>
             </div>
             <div style={styles.cardImageStack}>
                <img src="https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=300&q=80" style={{...styles.stackImg, zIndex:3, transform: 'rotate(-3deg)'}} alt="" />
                <img src="https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?w=300&q=80" style={{...styles.stackImg, zIndex:2, top: '10px', left: '20px', transform: 'rotate(2deg)'}} alt="" />
             </div>
          </FeatureCard>
        </div>
      </section>

      <section style={{...styles.featuresSection, paddingTop: 0}}>
         <div style={styles.bentoGrid4Cols}>
            <FeatureMiniCard icon={<FaShareAlt />} title="Partage Facile" theme={theme} delay={0.1}/>
            <FeatureMiniCard icon={<FiActivity />} title="Sauvegarde Auto" theme={theme} delay={0.2}/>
            <FeatureMiniCard icon={<FiCast />} title="Multi-appareils" theme={theme} delay={0.3}/>
            <FeatureMiniCard icon={<BiSupport />} title="Support 24/7" theme={theme} delay={0.4}/>
         </div>
      </section>

      <footer style={{ ...styles.footer, borderTopColor: theme.border, color: theme.subtext }}>
        <p>© {new Date().getFullYear()} MonDrive. L'excellence numérique.</p>
      </footer>
    </div>
  );
}

// --- Composants Cartes ---
const FeatureCard = ({ children, colSpan = 1, theme, delay = 0, style = {} }) => (
  <motion.div 
    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay, duration: 0.6 }}
    whileHover={{ y: -8, boxShadow: `0 20px 40px -10px ${theme.shadowColor}` }}
    style={{ ...styles.card, gridColumn: `span ${colSpan}`, backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.text, ...style }}
  >
    {children}
  </motion.div>
);

const FeatureMiniCard = ({ icon, title, theme, delay }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay }}
        whileHover={{ scale: 1.05, backgroundColor: theme.accent + '10' }}
        style={{...styles.miniCard, backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.text}}
    >
        <div style={{fontSize: '1.5rem', color: theme.accent, marginBottom: '10px'}}>{icon}</div>
        <h4 style={{fontWeight: '600', fontSize: '1rem'}}>{title}</h4>
    </motion.div>
)


// --- Styles System (Encore plus complet) ---
const styles = {
  light: {
    bg: '#F5F7FA', // Fond très légèrement gris pour plus de profondeur
    text: '#1c1c1e',
    subtext: '#6e6e73',
    navBg: 'rgba(255, 255, 255, 0.6)',
    cardBg: '#ffffff',
    border: 'rgba(0, 0, 0, 0.08)',
    accent: '#007AFF',
    shadowColor: 'rgba(0,0,0,0.1)',
    blob1: '#BFDBFE', blob2: '#E9D5FF',
    gradient: 'linear-gradient(135deg, #007AFF, #5856D6)',
    buttonGradient: 'linear-gradient(135deg, #007AFF, #0055FF)',
  },
  dark: {
    bg: '#000000',
    text: '#f5f5f7',
    subtext: '#a1a1a6',
    navBg: 'rgba(28, 28, 30, 0.6)',
    cardBg: '#1c1c1e',
    border: 'rgba(255, 255, 255, 0.12)',
    accent: '#0A84FF',
    shadowColor: 'rgba(0,0,0,0.5)',
    blob1: '#1e3a8a', blob2: '#581c87',
    gradient: 'linear-gradient(135deg, #0A84FF, #5E5CE6)',
    buttonGradient: 'linear-gradient(135deg, #0A84FF, #0066CC)',
  },
  container: { fontFamily: "'SF Pro Display', 'Inter', sans-serif", minHeight: '100vh', overflowX: 'hidden', position: 'relative', transition: 'background 0.5s' },
  ambientBackground: { position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' },
  blob: { position: 'absolute', width: '50vw', height: '50vw', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.3 },
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 5%', backdropFilter: 'blur(25px) saturate(180%)', WebkitBackdropFilter: 'blur(25px) saturate(180%)', position: 'sticky', top: 0, zIndex: 100, borderBottomWidth: '1px', borderBottomStyle: 'solid' },
  logoContainer: { display: 'flex', alignItems: 'center', gap: '8px' },
  logoText: { fontSize: '1.3rem', fontWeight: '700', letterSpacing: '-0.5px' },
  navActions: { display: 'flex', alignItems: 'center', gap: '15px' },
  iconButton: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.3rem', padding: '8px', borderRadius: '50%' },
  navButtonPrimary: { padding: '8px 20px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '20px', fontWeight: '600', fontSize:'0.9rem', cursor: 'pointer' },
  navButtonSecondary: { padding: '8px 20px', background: 'transparent', border: '2px solid', borderRadius: '20px', fontWeight: '600', fontSize:'0.9rem', cursor: 'pointer' },
  
  // Hero Redesigned
  heroSection: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '120px 5% 150px', minHeight: '85vh', zIndex: 1, gap: '40px' },
  heroContent: { flex: '1 1 450px', zIndex: 10 },
  title: { fontSize: 'clamp(3.5rem, 6vw, 5.5rem)', fontWeight: '800', lineHeight: '1.05', marginBottom: '25px', letterSpacing: '-1.5px' },
  highlight: { backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { fontSize: '1.3rem', marginBottom: '40px', lineHeight: '1.5', maxWidth: '500px', fontWeight: '500' },
  mainButton: { padding: '16px 36px', color: 'white', border: 'none', borderRadius: '30px', fontSize: '1.15rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' },
  
  // Le "Nuage" d'icônes
  heroCloudWrapper: { flex: '1 1 500px', height: '500px', position: 'relative', perspective: '1000px', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  cloudContainer: { width: '100%', height: '100%', position: 'relative' },

  // Bento Grid & Cards Richer
  featuresSection: { padding: '80px 5%', zIndex: 2, position: 'relative' },
  sectionHeader: { textAlign: 'left', marginBottom: '60px', maxWidth: '1200px', margin: '0 auto 60px' },
  sectionTitle: { fontSize: '3.5rem', fontWeight: '800', letterSpacing: '-1px' },
  bentoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '25px', maxWidth: '1200px', margin: '0 auto' },
  bentoGrid4Cols: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '25px', maxWidth: '1200px', margin: '40px auto 0' },
  card: { borderRadius: '28px', borderWidth: '1px', borderStyle: 'solid', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '320px', transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)' },
  cardContentPadded: { padding: '35px', zIndex: 2, position: 'relative' },
  cardHeaderRow: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' },
  iconBox: { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.4rem' },
  iconBoxBig: { width: '56px', height: '56px', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.8rem' },
  cardTitle: { fontSize: '1.6rem', fontWeight: '700' },
  cardDesc: { fontSize: '1.05rem', lineHeight: '1.5', fontWeight: '500', maxWidth: '90%' },
  cardImageOverlay: { position: 'absolute', top: 0, right: 0, width: '55%', height: '100%', objectFit: 'cover', opacity: 0.15, maskImage: 'linear-gradient(to left, black, transparent)' },
  securityIconsVisualization: { display: 'flex', alignItems: 'center', marginTop: '30px', padding: '15px', background: 'rgba(125,125,125,0.1)', borderRadius: '16px', width: 'fit-content', backdropFilter: 'blur(10px)' },
  cardImageStack: { position: 'absolute', bottom: 0, left: 0, width: '100%', height: '200px', overflow: 'hidden', display:'flex', justifyContent:'center', alignItems:'flex-end' },
  stackImg: { width: '220px', height: '140px', objectFit: 'cover', borderRadius: '16px 16px 0 0', boxShadow: '0 -10px 30px rgba(0,0,0,0.2)', position: 'absolute' },
  miniCard: { padding: '25px', borderRadius: '24px', border: '1px solid', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '140px' },
  
  footer: { padding: '40px 5%', textAlign: 'center', borderTopWidth: '1px', borderTopStyle: 'solid', marginTop: '80px', zIndex: 2, position: 'relative', fontWeight: '500' }
};

export default LandingPage;
