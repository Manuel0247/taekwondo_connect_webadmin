"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Scale, User } from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { GradeChip } from "@/components/admin/GradeChip";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";

export default function AthleteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: athlete, isLoading } = useQuery({
    queryKey: ["athlete", id],
    queryFn: async () => (await api.get(`/athletes/${id}`)).data.data,
  });
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Détail Athlète" />
      <div className="flex-1 overflow-y-auto p-6">
        <Link href="/athletes" className="inline-flex items-center gap-1.5 text-brand-muted hover:text-white text-sm mb-6">
          <ArrowLeft className="size-4" />Retour
        </Link>
        {isLoading ? <Skeleton className="h-40 rounded-xl bg-brand-surface" /> :
          !athlete ? <p className="text-brand-muted">Introuvable</p> : (
          <div className="space-y-5">
            <div className="bg-brand-surface rounded-xl border border-brand-border p-6 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange text-xl font-bold">
                {athlete.prenom[0]}{athlete.nom[0]}
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">{athlete.prenom} {athlete.nom}</h2>
                <p className="text-brand-muted text-sm">{athlete.email}</p>
                {athlete.grade && <div className="mt-2"><GradeChip grade={athlete.grade} /></div>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: Calendar, color: "text-brand-orange", label: "Naissance", value: athlete.date_naissance },
                { icon: Scale, color: "text-brand-green-light", label: "Poids", value: athlete.categorie_poids },
                { icon: User, color: "text-blue-400", label: "Sexe", value: athlete.sexe },
              ].map(({ icon: Icon, color, label, value }) => (
                <div key={label} className="bg-brand-surface rounded-xl border border-brand-border p-4 flex items-center gap-3">
                  <Icon className={`size-5 ${color} shrink-0`} />
                  <div><p className="text-brand-muted text-xs">{label}</p><p className="text-white text-sm font-medium">{value ?? "—"}</p></div>
                </div>
              ))}
            </div>
            {athlete.club && (
              <div className="bg-brand-surface rounded-xl border border-brand-border p-5">
                <h3 className="text-white font-semibold mb-1">Club</h3>
                <p className="text-brand-muted text-sm">{athlete.club.nom}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
