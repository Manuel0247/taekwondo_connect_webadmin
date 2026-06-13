"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Award, UserMinus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { TopBar } from "@/components/admin/TopBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

export default function BadgeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: badge, isLoading } = useQuery({
    queryKey: ["badge", id],
    queryFn: async () => (await api.get(`/badges/${id}`)).data.data,
  });
  const { data: athletes } = useQuery({
    queryKey: ["badge-athletes", id],
    queryFn: async () => (await api.get(`/admin/badges/${id}/athletes`)).data.data,
  });

  const revokeMutation = useMutation({
    mutationFn: (athleteId: string) => api.delete(`/admin/badges/${id}/revoke/${athleteId}`),
    onSuccess: () => { toast.success("Badge retiré"); queryClient.invalidateQueries({ queryKey: ["badge-athletes", id] }); },
    onError: () => toast.error("Erreur"),
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Détail Badge" />
      <div className="flex-1 overflow-y-auto p-6">
        <Link href="/badges" className="inline-flex items-center gap-1.5 text-brand-muted hover:text-white text-sm mb-6">
          <ArrowLeft className="size-4" />Retour
        </Link>
        {isLoading ? <Skeleton className="h-32 rounded-xl bg-brand-surface" /> : !badge ? (
          <p className="text-brand-muted">Badge introuvable</p>
        ) : (
          <div className="space-y-5">
            <div className="bg-brand-surface rounded-xl border border-brand-border p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-brand-orange/10">
                <Award className="size-8 text-brand-orange" />
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">{badge.nom}</h2>
                <p className="text-brand-muted text-sm mt-0.5">{badge.description ?? "—"}</p>
                <span className="mt-2 inline-flex px-2 py-0.5 rounded-full text-xs bg-white/5 text-brand-muted">{badge.type}</span>
              </div>
            </div>
            <div className="bg-brand-surface rounded-xl border border-brand-border">
              <div className="px-5 py-4 border-b border-brand-border">
                <h3 className="text-white font-semibold">Athlètes ayant ce badge ({athletes?.length ?? 0})</h3>
              </div>
              {!athletes?.length ? (
                <p className="text-brand-muted text-sm p-5">Aucun athlète</p>
              ) : (
                <div className="divide-y divide-brand-border/50">
                  {athletes.map((a: { id: string; prenom: string; nom: string; club?: { nom: string } }) => (
                    <div key={a.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-white text-sm font-medium">{a.prenom} {a.nom}</p>
                        <p className="text-brand-muted text-xs">{a.club?.nom ?? "—"}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => revokeMutation.mutate(a.id)}
                        className="text-brand-muted hover:text-red-400 h-7 px-2 text-xs">
                        <UserMinus className="size-3.5 mr-1" />Retirer
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
