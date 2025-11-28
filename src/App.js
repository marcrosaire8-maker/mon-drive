import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useAuth } from './contexts/AuthContext';

import LandingPage from './components/LandingPage';
import Signup from './components/Signup';
import AdminLogin from './components/AdminLogin'; // <--- NOUVEAU
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import Favorites from './components/Favorites';
import Pricing from './components/Pricing';
import AdminPanel from './components/AdminPanel';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* NOUVELLE ROUTE SECRÈTE POUR L'ADMIN */}
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Routes Client */}
        <Route path="/pricing" element={<RequireAuth><Pricing /></RequireAuth>} />
        <Route path="/dashboard" element={<RequirePro><Dashboard /></RequirePro>} />
        <Route path="/folder/:folderId" element={<RequirePro><Dashboard /></RequirePro>} />
        <Route path="/profile" element={<RequirePro><Profile /></RequirePro>} />
        <Route path="/favorites" element={<RequirePro><Favorites /></RequirePro>} />

        {/* Route Admin SÉCURISÉE */}
        <Route path="/admin" element={<RequireAdmin><AdminPanel /></RequireAdmin>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

// ... RequireAuth et RequirePro restent identiques ...
function RequireAuth({ children }) { const { user } = useAuth(); return user ? children : <Navigate to="/" />; }

function RequirePro({ children }) {
  const { user } = useAuth();
  const [isPro, setIsPro] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const check = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('is_pro').eq('id', user.id).single();
      setIsPro(data?.is_pro ?? false);
      setLoading(false);
    };
    check();
  }, [user]);
  if (!user) return <Navigate to="/" />;
  if (loading) return <div>Chargement...</div>;
  return isPro ? children : <Navigate to="/pricing" />;
}

// --- VRAIE SÉCURITÉ ADMIN RÉACTIVÉE ---
function RequireAdmin({ children }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!user) { setLoading(false); return; }
      // On utilise la fonction RPC sécurisée
      const { data } = await supabase.rpc('is_admin');
      setIsAdmin(data); // true ou false
      setLoading(false);
    };
    check();
  }, [user]);

  if (!user) return <Navigate to="/admin-login" />; // Si pas connecté, va au login admin
  if (loading) return <div>Vérification...</div>;
  
  if (!isAdmin) {
    // Si connecté mais pas admin -> Dehors !
    return <Navigate to="/dashboard" />;
  }

  return children;
}

export default App;
