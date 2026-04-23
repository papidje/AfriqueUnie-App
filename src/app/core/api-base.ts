/**
 * Base de l’API (context-path Spring : /api/rest).
 *
 * En local : {@code http://localhost:8080/api/rest}.
 * Depuis un téléphone / tablette sur le LAN (ex. {@code http://192.168.x.x:4200}) :
 * même hôte que la page, port 8080 — à condition que le backend tourne sur le Mac.
 */
function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined' || !window.location) {
    return 'http://localhost:8080/api/rest';
  }
  const { hostname } = window.location;
  const port = 8080;
  return `http://${hostname}:${port}/api/rest`;
}

/** Résolu une fois au chargement du module (hostname = machine qui affiche l’appli). */
export const API_BASE_URL = resolveApiBaseUrl();
