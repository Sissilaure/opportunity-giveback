import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  compteMoi,
  compteConnexion,
  compteInscription,
  compteDeconnexion,
  fetchNotifications,
} from "../lib/api";

const AuthContext = createContext(null);

// `utilisateur` : undefined = vérification en cours, null = non connecté, objet = connecté.
export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(undefined);
  const [nonLues, setNonLues] = useState(0);

  const rafraichirNotifications = useCallback(async () => {
    try {
      const { nonLues: n } = await fetchNotifications();
      setNonLues(n);
    } catch {
      /* une panne réseau ne doit pas gêner la navigation : le compteur reste tel quel */
    }
  }, []);

  useEffect(() => {
    let actif = true;
    compteMoi()
      .then(({ utilisateur: u }) => actif && setUtilisateur(u))
      .catch(() => actif && setUtilisateur(null));
    return () => {
      actif = false;
    };
  }, []);

  // Le compteur de la cloche se met à jour à la connexion, puis toutes les 2 minutes tant que l'onglet est visible.
  useEffect(() => {
    if (!utilisateur) return undefined;
    let actif = true;
    const charger = () =>
      fetchNotifications()
        .then((d) => actif && setNonLues(d.nonLues))
        .catch(() => {});
    charger();
    const intervalle = window.setInterval(() => {
      if (document.visibilityState === "visible") charger();
    }, 120000);
    return () => {
      actif = false;
      window.clearInterval(intervalle);
    };
  }, [utilisateur]);

  const connexion = useCallback(async (identifiants) => {
    const { utilisateur: u } = await compteConnexion(identifiants);
    setUtilisateur(u);
    return u;
  }, []);

  const inscription = useCallback(async (donnees) => {
    const { utilisateur: u } = await compteInscription(donnees);
    setUtilisateur(u);
    return u;
  }, []);

  const deconnexion = useCallback(async () => {
    try {
      await compteDeconnexion();
    } finally {
      setUtilisateur(null);
      setNonLues(0);
    }
  }, []);

  const valeur = useMemo(
    () => ({ utilisateur, nonLues, connexion, inscription, deconnexion, rafraichirNotifications }),
    [utilisateur, nonLues, connexion, inscription, deconnexion, rafraichirNotifications],
  );
  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>.");
  return ctx;
}
