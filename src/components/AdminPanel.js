import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext'; // Pour savoir qui JE suis
import AdminNavbar from './AdminNavbar';
import { Link } from 'react-router-dom';
import { 
  FaUser, FaCrown, FaMoneyBillWave, FaTrash, FaPlus, 
  FaChartPie, FaUsers, FaTags, FaSearch, FaHdd, FaArrowRight, FaSun, FaMoon, FaUserPlus, FaUserMinus 
} from 'react-icons/fa';
// Graphiques
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function AdminPanel() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState({ total: 0, pro: 0, revenue: 0, storage: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  
  // États Design & Animation
  const [isDarkMode, setIsDarkMode] = useState(true); // Admin sombre par défaut (Pro)
  const [loaded, setLoaded] = useState(false);

  // Formulaire Plans
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('');
  const [newPlanFeatures, setNewPlanFeatures] = useState('');

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsers(usersData || []);

      const { data: plansData } = await supabase.from('plans').select('*').order('price', { ascending: true });
      setPlans(plansData || []);

      const proCount = usersData ? usersData.filter(u => u.is_pro).length : 0;
      const { data: filesData } = await supabase.from('files').select('size');
      const totalSize = filesData ? filesData.reduce((acc, curr) => acc + (curr.size || 0), 0) : 0;

      setStats({
        total: usersData?.length || 0,
        pro: proCount,
        revenue: proCount * 2000,
        storage: totalSize
      });
    } catch (error) { console.error("Erreur admin:", error); }
  }

  // --- LOGIQUE ADMIN ---
  async function handleToggleAdmin(targetUser) {
    if (targetUser.id === currentUser.id) {
        alert("⛔ Impossible de modifier vos propres droits !");
        return;
    }
    const action = targetUser.is_admin ? "retirer" : "donner";
    if (!window.confirm(`Êtes-vous sûr de vouloir ${action} les droits Admin à ${targetUser.email} ?`)) return;

    try {
        const { error } = await supabase.rpc('toggle_admin_role', { 
            target_user_id: targetUser.id, 
            new_status: !targetUser.is_admin 
        });
        if (error) throw error;
        setUsers(users.map(u => u.id === targetUser.id ? { ...u, is_admin: !u.is_admin } : u));
    } catch (error) { alert("Erreur : " + error.message); }
  }

  // --- ACTIONS PLANS ---
  async function handleAddPlan(e) {
    e.preventDefault();
    if (!newPlanName) return;
    const featuresArray = newPlanFeatures.split(',').map(f => f.trim()).filter(f => f !== "");
    const { data, error } = await supabase.from('plans').insert({
      name: newPlanName, price: parseInt(newPlanPrice) || 0, features: featuresArray
    }).select();
    if (!error && data) {
      setPlans([...plans, data[0]]);
      setNewPlanName(''); setNewPlanPrice(''); setNewPlanFeatures('');
    }
  }

  async function handleDeletePlan(id) {
    if(!window.confirm("Supprimer ce plan ?")) return;
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (!error) setPlans(plans.filter(p => p.id !== id));
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // --- GRAPHIQUES & THÈMES ---
  const currentTheme = isDarkMode ? styles.dark : styles.light;
  const themeStyles = { ...styles.base, ...currentTheme };

  const dataPie = [
    { name: 'Gratuit', value: stats.total - stats.pro },
    { name: 'Premium', value: stats.pro },
  ];
  const COLORS = isDarkMode ? ['#4b5563', '#fbbf24'] : ['#cbd5e1', '#f59e0b']; 

  // Données fictives pour le graphique en aire
  const dataArea = [
    { name: 'Lun', uv: 4000 }, { name: 'Mar', uv: 3000 }, { name: 'Mer', uv: 2000 },
    { name: 'Jeu', uv: 2780 }, { name: 'Ven', uv: 1890 }, { name: 'Sam', uv: 2390 }, { name: 'Dim', uv: 3490 },
  ];

  // --- VUES ---
  const RenderDashboard = () => (
    <div style={styles.dashboardGrid}>
      {/* Stat Cards avec effet Glow */}
      {[
        { icon: FaUser, val: stats.total, label: 'Utilisateurs', color: '#3b82f6' },
        { icon: FaCrown, val: stats.pro, label: 'Membres Pro', color: '#fbbf24' },
        { icon: FaMoneyBillWave, val: `${stats.revenue.toLocaleString()} F`, label: 'Revenus', color: '#10b981' },
        { icon: FaHdd, val: formatBytes(stats.storage), label: 'Stockage', color: '#8b5cf6' }
      ].map((item, index) => (
        <div 
          key={index} 
          className="glass-card hover-lift"
          style={{...styles.statCard, backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor, animationDelay: `${index * 0.1}s`}}
        >
          <div style={{...styles.statIcon, backgroundColor: `${item.color}20`, color: item.color}}>
            <item.icon />
          </div>
          <div>
            <div style={{...styles.statValue, color: themeStyles.text}}>{item.val}</div>
            <div style={{...styles.statLabel, color: themeStyles.subText}}>{item.label}</div>
          </div>
        </div>
      ))}

      {/* Chart 1 */}
      <div className="glass-card" style={{...styles.chartCard, backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor}}>
        <h3 style={{color: themeStyles.text, marginBottom: '20px'}}>Répartition</h3>
        <div style={{height: '250px', width: '100%'}}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={dataPie} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {dataPie.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index]} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={{borderRadius:'10px', border:'none', background: isDarkMode?'#1f2937':'white'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2 (Area) */}
      <div className="glass-card" style={{...styles.chartCard, backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor}}>
        <h3 style={{color: themeStyles.text, marginBottom: '20px'}}>Trafic Réseau</h3>
        <div style={{height: '250px', width: '100%'}}>
            <ResponsiveContainer>
                <AreaChart data={dataArea}>
                    <defs>
                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e2e8f0"} vertical={false} />
                    <XAxis dataKey="name" stroke={themeStyles.subText} tickLine={false} axisLine={false} />
                    <YAxis stroke={themeStyles.subText} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{borderRadius:'10px', border:'none', background: isDarkMode?'#1f2937':'white', color: isDarkMode?'white':'black'}}/>
                    <Area type="monotone" dataKey="uv" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUv)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const RenderUsers = () => {
    const filteredUsers = users.filter(u => u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    return (
      <div className="glass-card" style={{...styles.contentCard, backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor}}>
        <div style={styles.headerRow}>
            <h3 style={{color: themeStyles.text}}>Utilisateurs ({filteredUsers.length})</h3>
            <div style={{...styles.searchBox, backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)'}}>
                <FaSearch color={themeStyles.subText}/>
                <input 
                  type="text" 
                  placeholder="Rechercher..." 
                  style={{...styles.searchInput, color: themeStyles.text}} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
            </div>
        </div>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={{borderBottom: `1px solid ${themeStyles.borderColor}`}}>
                <th style={{...styles.th, color: themeStyles.subText}}>Membre</th>
                <th style={{...styles.th, color: themeStyles.subText}}>Statut</th>
                <th style={{...styles.th, color: themeStyles.subText}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} className="tr-hover" style={{borderBottom: `1px solid ${themeStyles.borderColor}`}}>
                  <td style={{...styles.td, color: themeStyles.text}}>
                      <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                          <div style={{...styles.avatar, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'}}>
                            {u.full_name ? u.full_name[0] : "U"}
                          </div>
                          <div>
                            <div>{u.full_name || "Sans nom"}</div>
                            <div style={{fontSize:'0.75rem', color: themeStyles.subText}}>{u.email}</div>
                          </div>
                      </div>
                  </td>
                  <td style={styles.td}>
                    {u.is_admin ? <span style={styles.badgeAdmin}>ADMIN</span> : u.is_pro ? <span style={styles.badgePro}>PRO</span> : <span style={styles.badgeFree}>FREE</span>}
                  </td>
                  <td style={styles.td}>
                     {u.is_admin ? (
                         <button onClick={() => handleToggleAdmin(u)} disabled={u.id === currentUser.id} style={{...styles.actionBtn, color: '#ef4444'}}>
                            <FaUserMinus />
                         </button>
                     ) : (
                         <button onClick={() => handleToggleAdmin(u)} style={{...styles.actionBtn, color: '#10b981'}}>
                            <FaUserPlus />
                         </button>
                     )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const RenderPlans = () => (
    <div className="glass-card" style={{...styles.contentCard, backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor}}>
      <div style={{marginBottom:'40px'}}>
        <h3 style={{color: themeStyles.text, marginBottom:'15px'}}>Créer une offre</h3>
        <form onSubmit={handleAddPlan} style={styles.formGrid}>
            <input placeholder="Nom (ex: Gold)" value={newPlanName} onChange={e=>setNewPlanName(e.target.value)} style={{...styles.input, backgroundColor: isDarkMode?'rgba(0,0,0,0.3)':'#f1f5f9', color: themeStyles.text}} required/>
            <input type="number" placeholder="Prix" value={newPlanPrice} onChange={e=>setNewPlanPrice(e.target.value)} style={{...styles.input, backgroundColor: isDarkMode?'rgba(0,0,0,0.3)':'#f1f5f9', color: themeStyles.text}} required/>
            <input placeholder="Caractéristiques (séparées par des virgules)" value={newPlanFeatures} onChange={e=>setNewPlanFeatures(e.target.value)} style={{...styles.input, gridColumn: 'span 2', backgroundColor: isDarkMode?'rgba(0,0,0,0.3)':'#f1f5f9', color: themeStyles.text}}/>
            <button type="submit" style={styles.addBtn}><FaPlus/> Ajouter</button>
        </form>
      </div>
      
      <div style={styles.plansGrid}>
        {plans.map(p => (
            <div key={p.id} style={{...styles.planCard, borderColor: themeStyles.borderColor, background: isDarkMode?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                    <div>
                        <div style={{fontWeight:'bold', fontSize:'1.2rem', color: themeStyles.text}}>{p.name}</div>
                        <div style={{color: '#fbbf24', fontWeight:'bold', fontSize:'1.5rem'}}>{p.price} F</div>
                    </div>
                    <button onClick={() => handleDeletePlan(p.id)} style={styles.deleteBtn}><FaTrash/></button>
                </div>
                <div style={{marginTop:'15px', display:'flex', flexWrap:'wrap', gap:'5px'}}>
                    {p.features?.map((f,i) => <span key={i} style={{fontSize:'0.75rem', padding:'4px 8px', borderRadius:'4px', background: isDarkMode?'rgba(255,255,255,0.1)':'#e2e8f0', color: themeStyles.subText}}>{f}</span>)}
                </div>
            </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{...styles.pageWrapper, backgroundColor: themeStyles.bgColor}}>
      <AdminNavbar />
      
      {/* CSS INJECTÉ */}
      <style>
        {`
          @keyframes moveBlob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(50px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .glass-card {
            backdrop-filter: blur(16px) saturate(180%);
            -webkit-backdrop-filter: blur(16px) saturate(180%);
            border-radius: 20px;
            border: 1px solid;
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
            animation: fadeIn 0.6s ease-out forwards;
            opacity: 0;
          }
          .hover-lift { transition: transform 0.3s ease; }
          .hover-lift:hover { transform: translateY(-5px); }
          .tr-hover:hover td { background-color: ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'}; }
          ::-webkit-scrollbar { width: 8px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 4px; }
        `}
      </style>

      {/* BACKGROUND ANIMÉ */}
      <div style={{...styles.blob, top: '20%', left: '10%', background: '#fbbf24', animationDelay: '0s'}}></div>
      <div style={{...styles.blob, bottom: '20%', right: '10%', background: '#6366f1', animationDelay: '2s'}}></div>

      <div style={styles.layout}>
        {/* SIDEBAR FLOTTANTE */}
        <div className="glass-card" style={{...styles.sidebar, backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor}}>
            <div style={{marginBottom:'20px', paddingLeft:'10px', fontSize:'0.8rem', color: themeStyles.subText, textTransform:'uppercase', letterSpacing:'1px'}}>Menu</div>
            
            <button onClick={() => setActiveTab('dashboard')} style={activeTab === 'dashboard' ? styles.navBtnActive : {...styles.navBtn, color: themeStyles.subText}}>
                <FaChartPie /> Dashboard
            </button>
            <button onClick={() => setActiveTab('users')} style={activeTab === 'users' ? styles.navBtnActive : {...styles.navBtn, color: themeStyles.subText}}>
                <FaUsers /> Utilisateurs
            </button>
            <button onClick={() => setActiveTab('plans')} style={activeTab === 'plans' ? styles.navBtnActive : {...styles.navBtn, color: themeStyles.subText}}>
                <FaTags /> Abonnements
            </button>

            <div style={{marginTop:'auto', paddingTop:'20px', borderTop:`1px solid ${themeStyles.borderColor}`}}>
                <button onClick={() => setIsDarkMode(!isDarkMode)} style={{...styles.navBtn, color: themeStyles.subText}}>
                    {isDarkMode ? <><FaSun /> Mode Clair</> : <><FaMoon /> Mode Sombre</>}
                </button>
            </div>
        </div>

        {/* CONTENU */}
        <div style={styles.mainContent}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px'}}>
                <h2 style={{fontSize:'2rem', fontWeight:'800', color: themeStyles.text, margin:0}}>
                    {activeTab === 'dashboard' ? "Vue d'ensemble" : activeTab === 'users' ? "Gestion Membres" : "Offres & Tarifs"}
                </h2>
                <Link to="/dashboard" style={styles.linkBack}>
                    Voir le site <FaArrowRight size={12}/>
                </Link>
            </div>

            {activeTab === 'dashboard' && <RenderDashboard />}
            {activeTab === 'users' && <RenderUsers />}
            {activeTab === 'plans' && <RenderPlans />}
        </div>
      </div>
    </div>
  );
}

const styles = {
  // THEMES
  base: { transition: 'all 0.3s ease' },
  light: {
    bgColor: '#f8fafc',
    cardBg: 'rgba(255, 255, 255, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
    text: '#1e293b',
    subText: '#64748b'
  },
  dark: {
    bgColor: '#111827',
    cardBg: 'rgba(31, 41, 55, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    text: '#f3f4f6',
    subText: '#9ca3af'
  },

  pageWrapper: { minHeight: '100vh', position: 'relative', overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.25, width: '400px', height: '400px', zIndex: 0, animation: 'moveBlob 15s infinite alternate' },
  
  layout: { display: 'flex', maxWidth: '1400px', margin: '0 auto', padding: '30px', gap: '30px', position: 'relative', zIndex: 1, height: 'calc(100vh - 70px)' },
  
  // Sidebar
  sidebar: { width: '260px', padding: '25px', display: 'flex', flexDirection: 'column', gap: '10px', height: 'fit-content' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '12px', fontSize: '0.95rem', transition: '0.2s', textAlign:'left', fontWeight:'500' },
  navBtnActive: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', border: 'none', background: 'linear-gradient(90deg, #fbbf24, #d97706)', color: 'white', cursor: 'pointer', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)' },

  mainContent: { flex: 1, overflowY: 'auto', paddingRight:'10px' },
  linkBack: { textDecoration:'none', color: '#fbbf24', fontWeight:'bold', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding:'8px 16px', borderRadius:'20px', background:'rgba(251, 191, 36, 0.1)' },

  // Dashboard
  dashboardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '25px', marginBottom:'30px' },
  statCard: { padding: '25px', display: 'flex', alignItems: 'center', gap: '20px' },
  statIcon: { width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' },
  statValue: { fontSize: '1.8rem', fontWeight: '800', lineHeight:'1.2' },
  statLabel: { fontSize: '0.9rem' },
  chartCard: { padding: '25px', gridColumn: 'span 2' },

  // Users Table
  contentCard: { padding: '30px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 18px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', width:'200px' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth:'600px' },
  th: { textAlign: 'left', padding: '15px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing:'1px', fontWeight:'600' },
  td: { padding: '16px 15px', fontSize: '0.95rem' },
  avatar: { width: '36px', height: '36px', borderRadius: '10px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', boxShadow:'0 2px 5px rgba(0,0,0,0.2)' },
  actionBtn: { background: 'transparent', border: 'none', fontSize: '1.1rem', cursor: 'pointer', transition: 'transform 0.2s', padding:'5px' },

  // Badges
  badgeAdmin: { background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', border:'1px solid rgba(239, 68, 68, 0.3)' },
  badgePro: { background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', border:'1px solid rgba(245, 158, 11, 0.3)' },
  badgeFree: { background: 'rgba(156, 163, 175, 0.2)', color: '#9ca3af', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold' },

  // Plans
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', marginBottom:'30px' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' },
  addBtn: { padding: '0 25px', background: 'linear-gradient(90deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', display:'flex', alignItems:'center', gap:'8px', boxShadow:'0 4px 10px rgba(16, 185, 129, 0.3)' },
  plansGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  planCard: { padding: '20px', borderRadius: '16px', border: '1px solid', position:'relative' },
  deleteBtn: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition:'0.2s' }
};
