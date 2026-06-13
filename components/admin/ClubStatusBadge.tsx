import { cn } from "@/lib/utils";

type ClubStatus = "en_attente" | "valide" | "suspendu" | "refuse";

const config: Record<ClubStatus, { label: string; className: string }> = {
  en_attente: {
    label: "En attente",
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  },
  valide: {
    label: "Validé",
    className: "bg-brand-green/15 text-brand-green-light border-brand-green/30",
  },
  suspendu: {
    label: "Suspendu",
    className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  refuse: {
    label: "Refusé",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
};

export function ClubStatusBadge({ status }: { status: ClubStatus }) {
  const { label, className } = config[status] ?? {
    label: status,
    className: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        className
      )}
    >
      {label}
    </span>
  );
}
