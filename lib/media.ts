// L'API stocke des chemins relatifs au disque « public » (ex. "badge/<id>/icone/x.png")
// et renvoie parfois une URL complète : on normalise vers une URL affichable.
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/api\/v1\/?$/, "");

export function mediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith("/")) return `${API_ORIGIN}${path}`;
  return `${API_ORIGIN}/storage/${path}`;
}
