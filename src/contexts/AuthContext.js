import React, { useContext, useState, useEffect, createContext } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fonction pour charger les données complètes
  const loadUserData = async (sessionUser) => {
    if (!sessionUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // 1. On vérifie si ADMIN via la fonction sécurisée
      const { data: isAdmin } = await supabase.rpc('is_admin');

      // 2. On vérifie si PRO via la table profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_pro, plan')
        .eq('id', sessionUser.id)
        .single();

      // 3. On construit l'objet utilisateur final
      setUser({
        ...sessionUser,
        is_admin: isAdmin || false, // Sera TRUE si dans la table admins
        is_pro: profile?.is_pro || false,
        plan: profile?.plan || 'free'
      });

    } catch (err) {
      console.error("Erreur chargement user:", err);
      // En cas d'erreur, on connecte l'utilisateur avec des droits minimums
      setUser(sessionUser);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserData(session?.user ?? null);
    });

    // Écouteur de connexion/déconnexion
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        loadUserData(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    signUp: (data) => supabase.auth.signUp(data),
    signIn: (data) => supabase.auth.signInWithPassword(data),
    signOut: () => supabase.auth.signOut(),
    user,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
