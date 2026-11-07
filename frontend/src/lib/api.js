const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Les erreurs portent `status` (0 = serveur injoignable) pour que l'interface adapte son message.
function apiError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw apiError("Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw apiError(data.error || data.erreur || "Une erreur est survenue.", res.status);
  return data;
}

export async function fetchOpportunites({ q = "", type = "" } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type && type !== "toutes") params.set("type", type);
  return request(`/api/opportunites?${params.toString()}`);
}

export async function fetchOpportunite(id) {
  return request(`/api/opportunites/${id}`);
}

export async function rechercheIntelligente(description) {
  return request("/api/recherche-ia", { method: "POST", body: JSON.stringify({ description }) });
}

export async function fetchStats() {
  return request("/api/stats");
}

export async function fetchEquipe() {
  return request("/api/equipe");
}

export async function fetchTemoignages() {
  return request("/api/temoignages");
}

export async function inscrireNewsletter(email, frequence) {
  return request("/api/newsletter", { method: "POST", body: JSON.stringify({ email, frequence }) });
}

export async function fetchRessources() {
  return request("/api/resources");
}

export async function fetchRessource(id) {
  return request(`/api/resources/${id}`);
}

export async function fetchFaq() {
  return request("/api/faq");
}

export async function envoyerQuestion(texte) {
  return request("/api/questions", { method: "POST", body: JSON.stringify({ texte }) });
}

export async function fetchQuestionsRepondues() {
  return request("/api/questions/answered");
}

export async function adminLogin(email, motDePasse) {
  return request("/api/admin/login", { method: "POST", body: JSON.stringify({ email, motDePasse }) });
}

export async function adminLogout() {
  return request("/api/admin/logout", { method: "POST" });
}

export async function adminSession() {
  return request("/api/admin/session");
}

export async function adminFetchQuestions() {
  return request("/api/admin/questions");
}

export async function adminRepondreQuestion(id, reponse) {
  return request(`/api/admin/questions/${id}/answer`, {
    method: "POST",
    body: JSON.stringify({ reponse }),
  });
}

export async function adminFetchOpportunites(statut) {
  return request(`/api/admin/opportunites?statut=${statut}`);
}

export async function adminCreerOpportunite(payload) {
  return request("/api/admin/opportunites", { method: "POST", body: JSON.stringify(payload) });
}

export async function adminApprouverOpportunite(id) {
  return request(`/api/admin/opportunites/${id}/approuver`, { method: "POST" });
}

export async function adminSupprimerOpportunite(id) {
  return request(`/api/admin/opportunites/${id}`, { method: "DELETE" });
}

export async function adminLancerRechercheIA() {
  return request("/api/admin/opportunites/rechercher-ia", { method: "POST" });
}

// ---------- Comptes utilisateurs, suivi de candidatures, notifications ----------
export async function compteMoi() {
  return request("/api/compte/moi");
}

export async function compteInscription({ email, motDePasse, prenom }) {
  return request("/api/compte/inscription", { method: "POST", body: JSON.stringify({ email, motDePasse, prenom }) });
}

export async function compteConnexion({ email, motDePasse }) {
  return request("/api/compte/connexion", { method: "POST", body: JSON.stringify({ email, motDePasse }) });
}

export async function compteDeconnexion() {
  return request("/api/compte/deconnexion", { method: "POST" });
}

export async function compteSupprimer(motDePasse) {
  return request("/api/compte/moi", { method: "DELETE", body: JSON.stringify({ motDePasse }) });
}

export async function fetchSuiviCompte() {
  return request("/api/compte/suivi");
}

export async function enregistrerSuiviCompte(id, changements) {
  return request(`/api/compte/suivi/${id}`, { method: "PUT", body: JSON.stringify(changements) });
}

export async function retirerSuiviCompte(id) {
  return request(`/api/compte/suivi/${id}`, { method: "DELETE" });
}

export async function importerSuiviCompte(ids) {
  return request("/api/compte/suivi/importer", { method: "POST", body: JSON.stringify({ ids }) });
}

export async function fetchNotifications() {
  return request("/api/compte/notifications");
}

export async function marquerNotificationsLues(cles) {
  return request("/api/compte/notifications/lues", { method: "POST", body: JSON.stringify({ cles }) });
}
