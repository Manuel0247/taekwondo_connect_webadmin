"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { ClubStatusBadge } from "@/components/admin/ClubStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";

export default function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: club, isLoading } = useQuery({
    queryKey: ["club", id],
    queryFn: async () => {
      const res = await api.get(`/clubs/${id}`);
      return res.data.data;
    },
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Détail Club" />
      <div className="flex-1 overflow-y-auto p-6">
        <Link href="/clubs" className="inline-flex items-center gap-1.5 text-brand-muted hover:text-white transition-colors text-sm mb-6">
          <ArrowLeft className="size-4" />
          Retour aux clubs
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-xl bg-brand-surface" />
            <Skeleton className="h-48 rounded-xl bg-brand-surface" />
          </div>
        ) : !club ? (
          <div className="text-brand-muted">Club introuvable</div>
        ) : (
          <div className="space-y-5">
            <div className="bg-brand-surface rounded-xl border border-brand-border p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-white text-xl font-bold">{club.nom}</h2>
                  <div className="flex items-center gap-1.5 text-brand-muted text-sm mt-1">
                    <MapPin className="size-3.5" />
                    {club.adresse}, {club.ville}
                  </div>
                </div>
                <ClubStatusBadge status={club.statut} />
              </div>
              {club.description && (
                <p className="text-brand-muted text-sm mt-4">{club.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-brand-surface rounded-xl border border-brand-border p-5">
                <h3 className="text-white font-semibold mb-3">Maître de salle</h3>
                {club.maitre_salle ? (
                  <div className="space-y-1 text-sm">
                    <p className="text-white">{club.maitre_salle.prenom} {club.maitre_salle.nom}</p>
                    <p className="text-brand-muted">{club.maitre_salle.email}</p>
                  </div>
                ) : (
                  <p className="text-brand-muted text-sm">Non renseigné</p>
                )}
              </div>

              <div className="bg-brand-surface rounded-xl border border-brand-border p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Users className="size-4 text-brand-orange" />
                  Athlètes
                </h3>
                <p className="text-2xl font-bold text-white">{club.nb_athletes ?? 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
