"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { GradeChip } from "@/components/admin/GradeChip";
import { EmptyState } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

interface Athlete {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  grade?: string;
  club?: { nom: string };
  date_naissance?: string;
  sexe?: string;
}

export default function AthletesPage() {
  const [search, setSearch] = useState("");

  const { data: athletes, isLoading } = useQuery<Athlete[]>({
    queryKey: ["admin-athletes"],
    queryFn: async () => {
      const res = await api.get("/admin/athletes");
      return res.data.data;
    },
  });

  const filtered = (athletes ?? []).filter((a) => {
    const q = search.toLowerCase();
    return (
      (a.nom ?? "").toLowerCase().includes(q) ||
      (a.prenom ?? "").toLowerCase().includes(q) ||
      (a.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Athlètes" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted" />
            <Input
              placeholder="Rechercher un athlète…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-brand-surface border-brand-border text-white placeholder:text-brand-muted"
            />
          </div>
          <span className="text-brand-muted text-sm">
            {filtered.length} athlète{filtered.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg bg-brand-black" />
              ))}
            </div>
          ) : !filtered.length ? (
            <EmptyState message="Aucun athlète trouvé" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Athlète</th>
                    <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Email</th>
                    <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Club</th>
                    <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Grade</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((athlete) => (
                    <tr key={athlete.id} className="border-b border-brand-border/50 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange text-xs font-bold shrink-0">
                            {(athlete.prenom ?? "?")[0]}{(athlete.nom ?? "?")[0]}
                          </div>
                          <span className="text-white text-sm font-medium">{athlete.prenom} {athlete.nom}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-brand-muted text-sm">{athlete.email}</td>
                      <td className="px-5 py-3 text-brand-muted text-sm">{athlete.club?.nom ?? "—"}</td>
                      <td className="px-5 py-3">
                        {athlete.grade ? (
                          <GradeChip grade={athlete.grade as Parameters<typeof GradeChip>[0]["grade"]} />
                        ) : (
                          <span className="text-brand-muted text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/athletes/${athlete.id}`}
                          className="text-brand-orange hover:text-brand-orange-light text-xs font-medium transition-colors"
                        >
                          Voir
                        </Link>
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
