import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
// Ajout d'icônes pour l'interface
import { FaCheck, FaArrowRight, FaPhoneAlt, FaArrowLeft, FaSun, FaMoon, FaCrown, FaRocket } from 'react-icons/fa';
// Import Kkiapay (Respect de votre correction)
import { useKKiaPay } from 'kkiapay-react';

const KKPIA_API_KEY = "c0341e41bbf34befe73fbe912c5453c06416a8d6";
const SUPPORT_NUMBERS = ["0147880143", "0192878701"];

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  
  // États pour le design (Thème & Animation)
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Hook Kkiapay
  const { openKkiapayWidget, addKkiapayListener, removeKkiapayListener } = useKKiaPay();

  useEffect(() => {
    // Déclenche l'animation d'entrée
    setTimeout(() => setLoaded(true), 100);

    // 1. Récupération des plans
    async function getPlans() {
      const { data } = await supabase.from('plans').select('*').order('price', { ascending: true });
      setPlans(data || []);
    }
    getPlans();

    // 2. Gestionnaire de succès
    const successHandler = async (response) => {
      console.log("Paiement réussi :", response);
      try {
        await supabase
          .from('profiles')
          .update({ is_pro: true, plan: 'premium' })
          .eq('id', user.id);

        alert("🎉 Paiement validé ! Bienvenue dans le club.");
        navigate('/dashboard');
      } catch (error) {
        alert("Erreur activation compte. Contactez le support.");
      }
    };

    addKkiapayListener('success', successHandler);
    return () => {
      removeKkiapayListener('success', successHandler);
    };
  }, [user, navigate, addKkiapayListener, removeKkiapayListener]);

  const handleSubscription = async (plan) => {
    if (plan.price === 0) {
      const { error } = await supabase.from('profiles').update({ is_pro: true, plan: plan.name }).eq('id', user.id);
      if (!error) {
          alert(`Bienvenue dans le plan ${plan.name}`);
          navigate('/dashboard');
      }
      return;
    }

    openKkiapayWidget({
      amount: plan.price,
      key: KKPIA_API_KEY,
      sandbox: true,
      email: user.email,
      name: user.user_metadata?.full_name || user.email,
      reason: `Abonnement ${plan.name}`,
      theme: "#2563eb",
    });
  };

  // --- LOGIQUE DE THÈME DYNAMIQUE ---
  const currentTheme = isDarkMode ? styles.dark : styles.light;
  const themeStyles = { ...styles.base, ...currentTheme };

  return (
    <>
      {/* CSS INJECTÉ POUR LES ANIMATIONS COMPLEXES */}
      <style>
        {`
          @keyframes moveBlob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(50px, -50px) scale(1.1); }
            66% { transform: translate(-30px, 30px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          @keyframes floatUp {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0px); }
          }
          .glass-card:hover {
            transform: translateY(-10px) scale(1.02);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
            border-color: ${isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(37,99,235,0.4)'};
          }
          .btn-animate:hover {
            transform: scale(1.03);
            box-shadow: 0 0 20px rgba(37, 99, 235, 0.6);
          }
        `}
      </style>

      <div style={{...styles.pageWrapper, backgroundColor: themeStyles.bgColor}}>
        
        {/* ARRIÈRE-PLAN ANIMÉ (BLOBS) */}
        <div style={{...styles.blob, top: '-5%', left: '-5%', background: '#3b82f6', animationDelay: '0s'}}></div>
        <div style={{...styles.blob, top: '40%', right: '-10%', background: '#8b5cf6', animationDelay: '2s'}}></div>
        <div style={{...styles.blob, bottom: '-10%', left: '30%', background: '#ec4899', width: '300px', height: '300px', animationDelay: '4s'}}></div>

        {/* NAVBAR / HEADER */}
        <nav style={styles.navBar}>
          <Link 
            to="/dashboard" 
            style={{...styles.backLink, color: themeStyles.textColor}}
            onMouseEnter={(e) => e.target.style.opacity = 0.7}
            onMouseLeave={(e) => e.target.style.opacity = 1}
          >
            <div style={styles.iconCircle}><FaArrowLeft /></div>
            <span>Retour au Dashboard</span>
          </Link>

          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            style={styles.themeToggle}
          >
            {isDarkMode ? <FaSun color="#fbbf24" /> : <FaMoon color="#4b5563" />}
          </button>
        </nav>

        {/* CONTENU PRINCIPAL */}
        <div style={{
            ...styles.container, 
            opacity: loaded ? 1 : 0, 
            transform: loaded ? 'translateY(0)' : 'translateY(20px)'
        }}>
          
          <div style={{textAlign: 'center', marginBottom: '50px'}}>
             <span style={styles.tagline}>🚀 Passez à la vitesse supérieure</span>
             <h1 style={{...styles.title, color: themeStyles.titleColor}}>
               Choisissez votre Offre
             </h1>
             <p style={{color: themeStyles.subTextColor, fontSize: '1.1rem'}}>
               Débloquez tout le potentiel de votre espace avec nos offres exclusives.
             </p>
          </div>
          
          <div style={styles.grid}>
            {plans.length === 0 ? (
                <p style={{color: themeStyles.textColor, fontSize: '1.2rem'}}>Chargement des offres...</p>
            ) : plans.map((plan, index) => {
                const isFree = plan.price === 0;
                
                return (
                  <div 
                    key={plan.id} 
                    className="glass-card"
                    style={{
                        ...styles.card,
                        backgroundColor: themeStyles.cardBg,
                        borderColor: isFree ? themeStyles.borderColor : themeStyles.accentColor,
                        borderWidth: isFree ? '1px' : '2px',
                        animation: `floatUp 6s ease-in-out infinite`,
                        animationDelay: `${index * 1.5}s` // Décalage de l'animation
                    }}
                  >
                    {!isFree && (
                        <div style={styles.badge}>
                            <FaCrown style={{marginRight: '5px'}}/> PREMIUM
                        </div>
                    )}

                    <div style={{marginBottom: '20px', display:'flex', justifyContent:'center'}}>
                        <div style={{...styles.iconBox, background: isFree ? '#e2e8f0' : 'rgba(37, 99, 235, 0.2)', color: isFree ? '#64748b' : '#3b82f6'}}>
                            {isFree ? <FaRocket /> : <FaCrown />}
                        </div>
                    </div>

                    <h3 style={{...styles.planName, color: themeStyles.titleColor}}>{plan.name}</h3>
                    
                    <div style={{...styles.priceWrapper, color: themeStyles.titleColor}}>
                        <span style={{fontSize: '3rem', fontWeight: '800'}}>{isFree ? "Gratuit" : plan.price.toLocaleString()}</span>
                        {!isFree && <span style={{fontSize: '1rem', opacity: 0.7, marginLeft: '5px'}}>FCFA</span>}
                    </div>
                    
                    <div style={{...styles.divider, backgroundColor: themeStyles.borderColor}}></div>

                    <ul style={styles.features}>
                      {plan.features?.map((f, i) => (
                        <li key={i} style={{...styles.featureItem, color: themeStyles.textColor}}>
                            <div style={styles.checkIcon}>
                                <FaCheck size={10} color="white"/>
                            </div> 
                            {f}
                        </li>
                      ))}
                    </ul>

                    <button 
                      onClick={() => handleSubscription(plan)} 
                      className="btn-animate"
                      style={{
                          ...styles.btn,
                          background: isFree ? 'transparent' : 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                          color: isFree ? themeStyles.textColor : 'white',
                          border: isFree ? `2px solid ${themeStyles.borderColor}` : 'none'
                      }}
                    >
                      {isFree ? "Commencer maintenant" : "Payer via KKPia"} <FaArrowRight style={{marginLeft:'8px'}}/>
                    </button>
                  </div>
                );
            })}
          </div>

          <div style={{marginTop: '60px', textAlign: 'center'}}>
            <p style={{color: themeStyles.subTextColor, marginBottom: '15px'}}>Une question ? Notre support est là.</p>
            <div style={styles.contacts}>
                {SUPPORT_NUMBERS.map(num => (
                    <span key={num} style={{...styles.phoneBadge, background: themeStyles.cardBg, color: themeStyles.textColor, border: `1px solid ${themeStyles.borderColor}`}}>
                        <FaPhoneAlt size={12}/> {num}
                    </span>
                ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// --- SYSTÈME DE STYLES (GLASSMORPHISM) ---
const styles = {
  base: { transition: 'all 0.5s ease' },
  light: {
    bgColor: '#f8fafc',
    cardBg: 'rgba(255, 255, 255, 0.7)',
    titleColor: '#0f172a',
    textColor: '#334155',
    subTextColor: '#64748b',
    borderColor: 'rgba(203, 213, 225, 0.6)',
    accentColor: '#3b82f6',
  },
  dark: {
    bgColor: '#0f172a',
    cardBg: 'rgba(30, 41, 59, 0.65)',
    titleColor: '#f1f5f9',
    textColor: '#e2e8f0',
    subTextColor: '#94a3b8',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    accentColor: '#60a5fa',
  },

  pageWrapper: {
    minHeight: '100vh',
    position: 'relative',
    overflowX: 'hidden',
    fontFamily: '"Inter", system-ui, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },

  // Fond "Lava Lamp"
  blob: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(80px)',
    opacity: 0.4,
    width: '500px',
    height: '500px',
    zIndex: 0,
    animation: 'moveBlob 20s infinite alternate',
    pointerEvents: 'none',
  },

  navBar: {
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },

  backLink: {
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: '600',
    fontSize: '0.95rem',
    padding: '10px 20px',
    borderRadius: '30px',
    backdropFilter: 'blur(10px)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    transition: 'all 0.2s',
  },
  
  iconCircle: {
    width: '28px', height: '28px', borderRadius: '50%', 
    background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },

  themeToggle: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '50%',
    width: '45px',
    height: '45px',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(10px)',
    transition: 'transform 0.2s',
  },

  container: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'transform 0.8s ease-out, opacity 0.8s ease-out',
  },

  tagline: {
    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    fontSize: '0.9rem',
    marginBottom: '10px',
    display: 'block'
  },

  title: {
    fontSize: '3rem',
    fontWeight: '900',
    marginBottom: '15px',
    lineHeight: '1.2',
  },

  grid: {
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
    perspective: '1000px',
  },

  card: {
    position: 'relative',
    backdropFilter: 'blur(20px) saturate(180%)', // LE SECRET DU LOOK APPLE
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '24px',
    padding: '40px',
    width: '100%',
    maxWidth: '350px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderStyle: 'solid',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
  },

  badge: {
    position: 'absolute',
    top: '-15px',
    background: 'linear-gradient(90deg, #f59e0b, #d97706)',
    color: 'white',
    padding: '8px 20px',
    borderRadius: '30px',
    fontWeight: '700',
    fontSize: '0.8rem',
    boxShadow: '0 5px 15px rgba(245, 158, 11, 0.4)',
    display: 'flex', alignItems: 'center',
    zIndex: 2
  },

  iconBox: {
    width: '60px', height: '60px', borderRadius: '18px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.8rem'
  },

  planName: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '10px',
    textAlign: 'center'
  },

  priceWrapper: {
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'baseline'
  },

  divider: {
    height: '1px', width: '100%', margin: '10px 0 30px 0', opacity: 0.5
  },

  features: {
    listStyle: 'none', padding: 0, margin: '0 0 40px 0', width: '100%'
  },

  featureItem: {
    display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px', fontSize: '1rem', fontWeight: '500'
  },

  checkIcon: {
    backgroundColor: '#10b981', width: '20px', height: '20px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
  },

  btn: {
    width: '100%',
    padding: '16px',
    borderRadius: '16px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.3s ease',
    marginTop: 'auto' // Pousse le bouton en bas
  },

  contacts: { display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' },
  
  phoneBadge: { 
    padding: '8px 16px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '600', 
    display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(5px)'
  }
};
