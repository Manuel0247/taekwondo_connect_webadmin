"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

type EventStatus = "brouillon" | "publie" | "annule";
const statusConfig: Record<EventStatus, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
  publie: { label: "Publié", className: "bg-brand-green/15 text-brand-green-light border-brand-green/30" },
  annule: { label: "Annulé", className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: ev, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => (await api.get(`/events/${id}`)).data.data,
  });
  const { data: inscriptions } = useQuery({
    queryKey: ["event-inscriptions", id],
    queryFn: async () => (await api.get(`/events/${id}/inscriptions`)).data.data,
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Détail Événement" />
      <div className="flex-1 overflow-y-auto p-6">
        <Link href="/events" className="inline-flex items-center gap-1.5 text-brand-muted hover:text-white text-sm mb-6">
          <ArrowLeft className="size-4" />Retour
        </Link>
        {isLoading ? <Skeleton className="h-40 rounded-xl bg-brand-surface" /> : !ev ? (
          <p className="text-brand-muted">Événement introuvable</p>
        ) : (
          <div className="space-y-5">
            <div className="bg-brand-surface rounded-xl border border-brand-border p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-white text-xl font-bold">{ev.titre}</h2>
                <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border shrink-0",
                  (statusConfig[ev.statut as EventStatus] ?? statusConfig.brouillon).className)}>
                  {(statusConfig[ev.statut as EventStatus] ?? statusConfig.brouillon).label}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center gap-2 text-brand-muted text-sm">
                  <Calendar className="size-4 text-brand-orange shrink-0" />
                  {new Date(ev.date_debut).toLocaleString("fr-FR")}
                </div>
                <div className="flex items-center gap-2 text-brand-muted text-sm">
                  <MapPin className="size-4 text-brand-green-light shrink-0" />
                  {ev.adresse}
                </div>
                <div className="flex items-center gap-2 text-brand-muted text-sm">
                  <Users className="size-4 text-blue-400 shrink-0" />
                  {ev.places_total} places
                </div>
              </div>
            </div>

            <div className="bg-brand-surface rounded-xl border border-brand-border">
              <div className="px-5 py-4 border-b border-brand-border">
                <h3 className="text-white font-semibold">Inscriptions</h3>
              </div>
              {!inscriptions?.length ? (
                <p className="text-brand-muted text-sm p-5">Aucune inscription</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-brand-border">
                        {["Athlète", "Club", "Statut"].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {inscriptions.map((insc: { id: string; athlete?: { prenom: string; nom: string }; club?: { nom: string }; statut: string }) => (
                        <tr key={insc.id} className="border-b border-brand-border/50">
                          <td className="px-5 py-3 text-white text-sm">{insc.athlete?.prenom} {insc.athlete?.nom}</td>
                          <td className="px-5 py-3 text-brand-muted text-sm">{insc.club?.nom ?? "—"}</td>
                          <td className="px-5 py-3 text-brand-muted text-sm">{insc.statut}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
