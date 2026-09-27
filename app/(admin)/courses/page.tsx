"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { TopBar } from "@/components/admin/TopBar";
import { EmptyState } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface Club { id: string; nom: string; }
interface Course {
  id: string;
  titre: string;
  niveau: string;
  date_debut: string;
  places_total: number;
  places_disponibles?: number;
  est_recurrent: boolean;
  statut?: string;
}

const niveauColors: Record<string, string> = {
  debutant:      "bg-green-500/15 text-green-400 border-green-500/30",
  intermediaire: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  avance:        "bg-red-500/15 text-red-400 border-red-500/30",
  tous:          "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

export default function CoursesPage() {
  const [selectedClubId, setSelectedClubId] = useState<string>("");

  const { data: clubs, isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ["clubs-list"],
    queryFn: async () => {
      const res = await api.get("/clubs", { params: { limit: 100 } });
      const items = res.data.data ?? [];
      return Array.isArray(items) ? items : [];
    },
  });

  const { data: courses, isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["club-courses", selectedClubId],
    enabled: !!selectedClubId,
    queryFn: async () => {
      const res = await api.get(`/clubs/${selectedClubId}/courses`, { params: { limit: 100 } });
      const items = res.data.data ?? [];
      return Array.isArray(items) ? items : [];
    },
  });

  const selectedClub = clubs?.find((c) => c.id === selectedClubId);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Cours" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Club selector */}
        <div className="flex items-center gap-3">
          <label className="text-brand-muted text-sm shrink-0">Club :</label>
          {clubsLoading ? (
            <Skeleton className="h-9 w-[220px] rounded-lg bg-brand-surface" />
          ) : (
            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger className="w-[260px] bg-brand-surface border-brand-border text-white">
                <SelectValue placeholder="Sélectionner un club…" />
              </SelectTrigger>
              <SelectContent className="bg-brand-surface border-brand-border text-white">
                {(clubs ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedClub && courses && (
            <span className="text-brand-muted text-sm">
              {courses.length} cours
            </span>
          )}
        </div>

        {/* Courses table */}
        <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
          {!selectedClubId ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-brand-muted">
              <BookOpen className="size-8 opacity-40" />
              <p className="text-sm">Sélectionnez un club pour voir ses cours</p>
            </div>
          ) : coursesLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg bg-brand-black" />
              ))}
            </div>
          ) : !courses?.length ? (
            <EmptyState message="Aucun cours pour ce club" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-border">
                    {["Titre", "Niveau", "Date de début", "Places", "Disponibles", "Récurrent"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id} className="border-b border-brand-border/50 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3 text-white text-sm font-medium">{c.titre}</td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          "inline-flex px-2 py-0.5 rounded-full text-xs font-medium border",
                          niveauColors[c.niveau] ?? "bg-gray-500/15 text-gray-400 border-gray-500/30"
                        )}>
                          {c.niveau}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-brand-muted text-sm">
                        {new Date(c.date_debut).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-5 py-3 text-brand-muted text-sm">{c.places_total}</td>
                      <td className="px-5 py-3 text-brand-muted text-sm">
                        {c.places_disponibles ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          "inline-flex px-2 py-0.5 rounded-full text-xs font-medium border",
                          c.est_recurrent
                            ? "bg-brand-green/15 text-brand-green-light border-brand-green/30"
                            : "bg-gray-500/15 text-gray-400 border-gray-500/30"
                        )}>
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
