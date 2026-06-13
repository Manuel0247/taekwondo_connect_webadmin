"use client";

import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/admin/TopBar";
import { EmptyState } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface Course { id: string; titre: string; niveau: string; date_debut: string; places_total: number; est_recurrent: boolean; club?: { nom: string }; }

const niveauColors: Record<string, string> = {
  debutant: "bg-green-500/15 text-green-400",
  intermediaire: "bg-yellow-500/15 text-yellow-400",
  avance: "bg-red-500/15 text-red-400",
  tous: "bg-blue-500/15 text-blue-400",
};

export default function CoursesPage() {
  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const res = await api.get("/clubs/me/courses");
      return res.data.data;
    },
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Cours" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg bg-brand-black" />)}</div>
          ) : !courses?.length ? <EmptyState message="Aucun cours" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-border">
                    {["Titre","Club","Niveau","Date","Places","Récurrent"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id} className="border-b border-brand-border/50 hover:bg-white/2">
                      <td className="px-5 py-3 text-white text-sm font-medium">{c.titre}</td>
                      <td className="px-5 py-3 text-brand-muted text-sm">{c.club?.nom ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", niveauColors[c.niveau] ?? "")}>{c.niveau}</span>
                      </td>
                      <td className="px-5 py-3 text-brand-muted text-sm">{new Date(c.date_debut).toLocaleDateString("fr-FR")}</td>
                      <td className="px-5 py-3 text-brand-muted text-sm">{c.places_total}</td>
                      <td className="px-5 py-3">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", c.est_recurrent ? "bg-brand-green/15 text-brand-green-light" : "bg-gray-500/15 text-gray-400")}>
                          {c.est_recurrent ? "Oui" : "Non"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
