import { Award } from "lucide-react";
import { mediaUrl } from "@/lib/media";

const typeColors: Record<string, string> = {
  competition: "text-yellow-400 bg-yellow-400/10",
  grade: "text-blue-400 bg-blue-400/10",
  assiduite: "text-green-400 bg-green-400/10",
  anciennete: "text-purple-400 bg-purple-400/10",
  special: "text-brand-orange bg-brand-orange/10",
};

/** Icône du badge si elle existe, sinon pictogramme coloré selon le type. */
export function BadgeIcon({
  badge,
  size = "md",
}: {
  badge: { nom: string; type: string; icone_url?: string | null };
  size?: "md" | "lg";
}) {
  const box = size === "lg" ? "size-14" : "size-9";
  const url = mediaUrl(badge.icone_url);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={badge.nom} className={`${box} rounded-lg object-cover bg-brand-black shrink-0`} />;
  }
  return (
    <div className={`${box} rounded-lg flex items-center justify-center shrink-0 ${typeColors[badge.type] ?? "bg-gray-400/10 text-gray-400"}`}>
      <Award className={size === "lg" ? "size-7" : "size-5"} />
    </div>
  );
}
