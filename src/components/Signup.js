import React, { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { FaArrowLeft, FaEnvelope, FaLock, FaMoon, FaSun, FaTimes, FaPaperPlane } from 'react-icons/fa';

export default function Signup() {
  const emailRef = useRef();
  const passwordRef = useRef();
  const resetEmailRef = useRef();
  
  const { signUp, signIn } = useAuth();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  
  const navigate = useNavigate();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [0, window.innerHeight], [5, -5]);
  const rotateY = useTransform(x, [0, window.innerWidth], [-5, 5]);

  function handleMouseMove(event) {
    x.set(event.clientX);
    y.set(event.clientY);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      setLoading(true);
      if (isLogin) {
        const { error } = await signIn({
          email: emailRef.current.value,
          password: passwordRef.current.value,
        });
        if (error) throw error;
      } else {
        const { error } = await signUp({
          email: emailRef.current.value,
          password: passwordRef.current.value,
        });
        if (error) throw error;
      }
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(isLogin ? "Identifiants incorrects." : "Échec de l'inscription.");
    }
    setLoading(false);
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      setLoading(true);
      
      const email = resetEmailRef.current.value;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/update-password',
      });

      if (error) throw error;
      
      setMessage("📨 Email envoyé ! Vérifiez votre boîte.");
      setTimeout(() => setShowResetModal(false), 3000);

    } catch (err) {
      setError("Erreur : Impossible d'envoyer l'email.");
    }
    setLoading(false);
  }

  const theme = darkMode ? styles.dark : styles.light;

  return (
    <div 
      style={{ ...styles.container, backgroundColor: theme.bg }} 
      onMouseMove={handleMouseMove}
    >
      <div style={styles.backgroundLayer}>
        <motion.div style={{ ...styles.blob, backgroundColor: theme.blob1, top: '10%', left: '20%', x: useTransform(x, val => val / 20), y: useTransform(y, val => val / 20) }} />
        <motion.div style={{ ...styles.blob, backgroundColor: theme.blob2, bottom: '20%', right: '10%', width: '400px', height: '400px', x: useTransform(x, val => val / -15), y: useTransform(y, val => val / -15) }} />
      </div>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setDarkMode(!darkMode)}
        style={{ ...styles.themeToggle, color: theme.text, borderColor: theme.border }}
      >
        {darkMode ? <FaSun /> : <FaMoon />}
      </motion.button>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        style={{ ...styles.cardWrapper, perspective: 1000 }}
      >
        <motion.div
          style={{ 
            ...styles.card, 
            rotateX, rotateY, 
            backgroundColor: theme.cardBg, 
            borderColor: theme.border,
            color: theme.text
          }}
        >
          <div style={styles.header}>
            <Link to="/" style={{ ...styles.backLink, color: theme.subtext }}>
              <FaArrowLeft /> Retour
            </Link>
            <h2 style={styles.title}>
              {isLogin ? "Bon retour 👋" : "Bienvenue 🚀"}
            </h2>
            <p style={{ color: theme.subtext, fontSize: '0.95rem' }}>
              {isLogin ? "Accédez à votre espace sécurisé." : "Créez votre cloud privé en quelques secondes."}
            </p>
          </div>

          <AnimatePresence>
            {error && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={styles.errorAlert}>{error}</motion.div>}
            {message && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={styles.successAlert}>{message}</motion.div>}
          </AnimatePresence>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email</label>
              <div style={styles.inputWrapper}>
                <FaEnvelope style={{ ...styles.inputIcon, color: theme.subtext }} />
                <motion.input whileFocus={{ scale: 1.02, borderColor: theme.accent }} type="email" ref={emailRef} required placeholder="nom@exemple.com" style={{ ...styles.input, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }} />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <label style={styles.label}>Mot de passe</label>
                {isLogin && (
                  <span 
                    onClick={() => { setError(''); setMessage(''); setShowResetModal(true); }}
                    style={{ ...styles.forgotLink, color: theme.accent }}
                  >
                    Oublié ?
                  </span>
                )}
              </div>
              <div style={styles.inputWrapper}>
                <FaLock style={{ ...styles.inputIcon, color: theme.subtext }} />
                <motion.input whileFocus={{ scale: 1.02, borderColor: theme.accent }} type="password" ref={passwordRef} required placeholder="••••••••" style={{ ...styles.input, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }} />
              </div>
            </div>

            <motion.button 
              disabled={loading} 
              type="submit" 
              whileHover={{ scale: 1.02, boxShadow: `0 10px 20px ${theme.accent}40` }}
              whileTap={{ scale: 0.98 }}
              style={{ ...styles.button, backgroundImage: theme.gradient }}
            >
              {loading ? "Chargement..." : (isLogin ? "Se connecter" : "S'inscrire")}
            </motion.button>
          </form>

          <div style={styles.footer}>
            {isLogin ? "Pas encore de compte ? " : "Déjà membre ? "}
            <button onClick={() => setIsLogin(!isLogin)} style={{ ...styles.linkBtn, color: theme.accent }}>
              {isLogin ? "Créer un compte" : "Se connecter"}
            </button>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showResetModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.8, y: 50 }}
              style={{ ...styles.modalCard, backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }}
            >
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                <h3 style={{margin:0}}>Réinitialisation</h3>
                <button onClick={() => setShowResetModal(false)} style={{background:'none', border:'none', color:theme.subtext, cursor:'pointer', fontSize:'1.2rem'}}><FaTimes /></button>
              </div>
              
              <p style={{color: theme.subtext, fontSize:'0.9rem', marginBottom:'20px'}}>
                Entrez votre email pour recevoir un lien de réinitialisation.
              </p>

              {message && <div style={styles.successAlert}>{message}</div>}
              {error && <div style={styles.errorAlert}>{error}</div>}

              <form onSubmit={handleResetPassword}>
                <div style={styles.inputWrapper}>
                  <FaEnvelope style={{ ...styles.inputIcon, color: theme.subtext }} />
                  <input type="email" ref={resetEmailRef} required placeholder="votre@email.com" style={{ ...styles.input, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }} />
                </div>
                <motion.button 
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ ...styles.button, backgroundImage: theme.gradient, marginTop: '20px' }}
                >
                  {loading ? "Envoi..." : <><FaPaperPlane style={{marginRight:'8px'}}/> Envoyer</>}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// --- Styles System ---
const styles = {
  light: {
    bg: '#F5F7FA', text: '#111827', subtext: '#6b7280', cardBg: 'rgba(255, 255, 255, 0.85)', inputBg: 'rgba(255, 255, 255, 0.9)', border: 'rgba(0, 0, 0, 0.08)', accent: '#2563eb', blob1: '#BFDBFE', blob2: '#E9D5FF', gradient: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
  },
  dark: {
    bg: '#0f172a', text: '#f3f4f6', subtext: '#9ca3af', cardBg: 'rgba(30, 41, 59, 0.85)', inputBg: 'rgba(15, 23, 42, 0.8)', border: 'rgba(255, 255, 255, 0.1)', accent: '#60a5fa', blob1: '#1e3a8a', blob2: '#581c87', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  },
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden', transition: 'background-color 0.5s ease' },
  backgroundLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none' },
  blob: { position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.5 },
  themeToggle: { position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: '2px solid', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20, fontSize: '1.2rem' },
  cardWrapper: { width: '100%', maxWidth: '440px', padding: '20px', zIndex: 10 },
  card: { backdropFilter: 'blur(20px)', padding: '40px', borderRadius: '30px', borderWidth: '1px', borderStyle: 'solid', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', transformStyle: 'preserve-3d' },
  header: { textAlign: "center", marginBottom: "30px" },
  backLink: { display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500', marginBottom: '20px', transition: 'opacity 0.2s' },
  title: { fontSize: '2rem', fontWeight: '800', marginBottom: '10px', letterSpacing: '-1px' },
  errorAlert: { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center', fontWeight: '600' },
  successAlert: { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center', fontWeight: '600' },
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "0.9rem", fontWeight: "600", marginLeft: '5px' },
  forgotLink: { fontSize: "0.85rem", fontWeight: "600", cursor: 'pointer', textDecoration: 'underline' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '15px', zIndex: 1, fontSize: '1rem' },
  input: { width: '100%', padding: '14px 14px 14px 45px', borderRadius: '16px', border: '2px solid', fontSize: '1rem', outline: 'none', transition: 'all 0.3s ease', fontWeight: '500' },
  button: { marginTop: "10px", padding: "16px", color: "white", border: "none", borderRadius: "16px", fontWeight: "700", cursor: "pointer", fontSize: "1.05rem", boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  footer: { marginTop: "30px", textAlign: "center", fontSize: "0.95rem" },
  linkBtn: { background: 'none', border: 'none', fontWeight: "700", cursor: "pointer", textDecoration: "none", padding: 0, fontFamily: 'inherit', fontSize: 'inherit' },
  
  // MODALE STYLES
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, backdropFilter: 'blur(5px)' },
  modalCard: { width: '90%', maxWidth: '400px', padding: '30px', borderRadius: '24px', border: '1px solid', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }
};
