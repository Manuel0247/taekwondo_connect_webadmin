import { cn } from "@/lib/utils";

type Grade = "blanc" | "jaune" | "orange" | "vert" | "bleu" | "rouge" | "noir";

const config: Record<Grade, { label: string; className: string }> = {
  blanc: { label: "Blanc", className: "bg-gray-200 text-gray-800" },
  jaune: { label: "Jaune", className: "bg-yellow-300 text-yellow-900" },
  orange: { label: "Orange", className: "bg-orange-400 text-white" },
  vert: { label: "Vert", className: "bg-green-600 text-white" },
  bleu: { label: "Bleu", className: "bg-blue-600 text-white" },
  rouge: { label: "Rouge", className: "bg-red-600 text-white" },
  noir: { label: "Noir", className: "bg-gray-900 text-white border border-gray-600" },
};

export function GradeChip({ grade }: { grade: Grade }) {
  const { label, className } = config[grade] ?? {
    label: grade,
    className: "bg-gray-600 text-white",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        className
      )}
    >
      {label}
    </span>
  );
}
