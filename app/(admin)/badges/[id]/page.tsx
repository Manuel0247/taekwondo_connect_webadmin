"use client";

import { use, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserMinus, UserPlus, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { TopBar } from "@/components/admin/TopBar";
import { BadgeIcon } from "@/components/admin/BadgeIcon";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import api from "@/lib/api";

interface Holder {
  athleteId: string;
  prenom: string;
  nom: string;
  club: string | null;
  obtenuLe: string | null;
  contexte: string | null;
}

interface AthleteOption {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  club: string | null;
}

function apiErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
}

export default function BadgeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [awardOpen, setAwardOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<Holder | null>(null);

  const { data: badge, isLoading } = useQuery({
    queryKey: ["badge", id],
    queryFn: async () => (await api.get(`/badges/${id}`)).data.data,
  });

  // L'API renvoie les liaisons athlète ↔ badge (athlete_badges), avec l'athlète imbriqué
  const { data: holders = [] } = useQuery<Holder[]>({
    queryKey: ["badge-athletes", id],
    queryFn: async () => {
      const list = (await api.get(`/admin/badges/${id}/athletes`)).data.data ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return list.map((ab: any) => ({
        athleteId: ab.athlete_id,
        prenom: ab.athlete?.user?.prenom ?? "—",
        nom: ab.athlete?.user?.nom ?? "",
        club: ab.athlete?.club?.nom ?? null,
        obtenuLe: ab.obtenu_le ?? null,
        contexte: ab.contexte ?? null,
      }));
    },
  });

  const { data: athletes = [], isLoading: athletesLoading } = useQuery<AthleteOption[]>({
    queryKey: ["admin-athletes-options"],
    enabled: awardOpen,
    queryFn: async () => {
      const list = (await api.get("/admin/athletes", { params: { limit: 1000 } })).data.data ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return list.map((a: any) => ({
        id: a.id,
        prenom: a.user?.prenom ?? "",
        nom: a.user?.nom ?? "",
        email: a.user?.email ?? "",
        club: a.club?.nom ?? null,
      }));
    },
  });

  const holderIds = useMemo(() => new Set(holders.map((h) => h.athleteId)), [holders]);
  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return athletes
      .filter((a) => !holderIds.has(a.id))
      .filter((a) => !q || `${a.prenom} ${a.nom} ${a.email} ${a.club ?? ""}`.toLowerCase().includes(q))
      .slice(0, 50);
  }, [athletes, holderIds, search]);

  const awardMutation = useMutation({
    mutationFn: (athleteId: string) =>
      api.post(`/admin/badges/${id}/award`, { athlete_id: athleteId, contexte: "Attribution manuelle" }),
    onSuccess: () => {
      toast.success("Badge attribué");
      queryClient.invalidateQueries({ queryKey: ["badge-athletes", id] });
    },
    onError: (err) => toast.error("Attribution impossible", { description: apiErrorMessage(err) }),
  });

  const revokeMutation = useMutation({
    mutationFn: (athleteId: string) => api.delete(`/admin/badges/${id}/revoke/${athleteId}`),
    onSuccess: () => {
      toast.success("Badge retiré");
      queryClient.invalidateQueries({ queryKey: ["badge-athletes", id] });
      setRevokeTarget(null);
    },
    onError: (err) => toast.error("Retrait impossible", { description: apiErrorMessage(err) }),
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
              <BadgeIcon badge={badge} size="lg" />
              <div>
                <h2 className="text-white text-xl font-bold">{badge.nom}</h2>
                <p className="text-brand-muted text-sm mt-0.5">{badge.description || "—"}</p>
                <span className="mt-2 inline-flex px-2 py-0.5 rounded-full text-xs bg-white/5 text-brand-muted">{badge.type}</span>
              </div>
            </div>
            <div className="bg-brand-surface rounded-xl border border-brand-border">
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-brand-border">
                <h3 className="text-white font-semibold">Athlètes ayant ce badge ({holders.length})</h3>
                <Button size="sm" onClick={() => { setSearch(""); setAwardOpen(true); }}
                  className="bg-brand-orange hover:bg-brand-orange-light text-white h-8 px-3 text-xs">
                  <UserPlus className="size-3.5 mr-1" />Attribuer
                </Button>
              </div>
              {!holders.length ? (
                <p className="text-brand-muted text-sm p-5">Aucun athlète</p>
              ) : (
                <div className="divide-y divide-brand-border/50">
                  {holders.map((h) => (
                    <div key={h.athleteId} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <Link href={`/athletes/${h.athleteId}`} className="text-white text-sm font-medium hover:text-brand-orange">
                          {h.prenom} {h.nom}
                        </Link>
                        <p className="text-brand-muted text-xs">
                          {h.club ?? "Sans club"}
                          {h.obtenuLe && ` · obtenu le ${new Date(h.obtenuLe).toLocaleDateString("fr-FR")}`}
                          {h.contexte && ` · ${h.contexte}`}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setRevokeTarget(h)}
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

      <Dialog open={awardOpen} onOpenChange={setAwardOpen}>
        <DialogContent className="bg-brand-surface border-brand-border text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Attribuer « {badge?.nom} »</DialogTitle>
          </DialogHeader>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted" />
            <Input
              autoFocus
              placeholder="Nom, email ou club…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
            />
          </div>
          <div className="max-h-80 overflow-y-auto -mx-1 mt-2">
            {athletesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-brand-muted" /></div>
            ) : !candidates.length ? (
              <p className="text-brand-muted text-sm text-center py-8">
                {search ? "Aucun athlète trouvé" : "Tous les athlètes ont déjà ce badge"}
              </p>
            ) : (
              candidates.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-1 py-2 border-b border-brand-border/40 last:border-0">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{a.prenom} {a.nom}</p>
                    <p className="text-brand-muted text-xs truncate">{a.club ?? "Sans club"} · {a.email}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => awardMutation.mutate(a.id)}
                    disabled={awardMutation.isPending}
                    className="bg-brand-green hover:bg-brand-green-light text-white h-7 px-2.5 text-xs shrink-0"
                  >
                    {awardMutation.isPending && awardMutation.variables === a.id
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : "Attribuer"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(o) => { if (!o) setRevokeTarget(null); }}
        title="Retirer le badge"
        description={`Retirer « ${badge?.nom} » à ${revokeTarget?.prenom} ${revokeTarget?.nom} ?`}
        variant="destructive"
        confirmLabel="Retirer"
        loading={revokeMutation.isPending}
        onConfirm={() => revokeTarget && revokeMutation.mutate(revokeTarget.athleteId)}
      />
    </div>
  );
}
