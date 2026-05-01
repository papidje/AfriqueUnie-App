/**
 * Base de l’API (context-path Spring : /api/rest).
 *
 * - {@code ng serve} (port 4200) : API sur le même hôte, port 8080.
 * - Docker / prod (Nginx sur 80/443) : même origine, reverse proxy vers le backend → /api/rest.
 */
function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined' || !window.location) {
    return 'http://localhost:8080/api/rest';
  }
  const { hostname, port, protocol, origin } = window.location;
  if (port === '4200') {
    return `${protocol}//${hostname}:8080/api/rest`;
  }
  return `${origin}/api/rest`;
}

/** Résolu une fois au chargement du module (hostname = machine qui affiche l’appli). */
export const API_BASE_URL = resolveApiBaseUrl();
