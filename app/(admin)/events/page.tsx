"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Send, XCircle, Eye } from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { EmptyState } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

type EventStatus = "brouillon" | "publie" | "annule";
type EventType = "competition" | "passage_grade" | "stage" | "cours_special";

interface Event {
  id: string;
  titre: string;
  type: EventType;
  date_debut: string;
  places_total: number;
  statut: EventStatus;
}

const statusConfig: Record<EventStatus, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
  publie: { label: "Publié", className: "bg-brand-green/15 text-brand-green-light border-brand-green/30" },
  annule: { label: "Annulé", className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

const typeLabels: Record<EventType, string> = {
  competition: "Compétition", passage_grade: "Passage de grade", stage: "Stage", cours_special: "Cours spécial",
};

export default function EventsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["events"],
    queryFn: async () => (await api.get("/events")).data.data,
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.put(`/events/${id}/publish`),
    onSuccess: () => { toast.success("Événement publié"); queryClient.invalidateQueries({ queryKey: ["events"] }); },
    onError: () => toast.error("Erreur"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.put(`/events/${id}/cancel`),
    onSuccess: () => { toast.success("Événement annulé"); queryClient.invalidateQueries({ queryKey: ["events"] }); },
    onError: () => toast.error("Erreur"),
  });

  const filtered = (events ?? []).filter((e) =>
    e.titre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Événements" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted" />
            <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-brand-surface border-brand-border text-white placeholder:text-brand-muted" />
          </div>
          <Link href="/events/new">
            <Button className="bg-brand-orange hover:bg-brand-orange-light text-white">
              <Plus className="size-4 mr-1.5" />Créer un événement
            </Button>
          </Link>
        </div>

        <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg bg-brand-black" />)}</div>
          ) : !filtered.length ? <EmptyState message="Aucun événement" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-border">
                    {["Titre", "Type", "Date", "Places", "Statut", ""].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ev) => {
                    const s = statusConfig[ev.statut] ?? statusConfig.brouillon;
                    return (
                      <tr key={ev.id} className="border-b border-brand-border/50 hover:bg-white/2 transition-colors">
                        <td className="px-5 py-3 text-white text-sm font-medium">{ev.titre}</td>
                        <td className="px-5 py-3 text-brand-muted text-sm">{typeLabels[ev.type] ?? ev.type}</td>
                        <td className="px-5 py-3 text-brand-muted text-sm">{new Date(ev.date_debut).toLocaleDateString("fr-FR")}</td>
                        <td className="px-5 py-3 text-brand-muted text-sm">{ev.places_total}</td>
                        <td className="px-5 py-3">
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", s.className)}>{s.label}</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5 justify-end">
                            <Link href={`/events/${ev.id}`}>
                              <Button size="sm" variant="ghost" className="text-brand-muted hover:text-white h-7 px-2">
                                <Eye className="size-3.5" />
                              </Button>
                            </Link>
                            {ev.statut === "brouillon" && (
                              <Button size="sm" onClick={() => publishMutation.mutate(ev.id)}
                                className="bg-brand-green hover:bg-brand-green-light text-white h-7 px-2.5 text-xs">
                                <Send className="size-3 mr-1" />Publier
                              </Button>
                            )}
                            {ev.statut === "publie" && (
                              <Button size="sm" variant="outline" onClick={() => cancelMutation.mutate(ev.id)}
                                className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-7 px-2.5 text-xs">
                                <XCircle className="size-3 mr-1" />Annuler
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
