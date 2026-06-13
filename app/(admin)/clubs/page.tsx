"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, XCircle, PauseCircle, Search, Filter } from "lucide-react";
import { TopBar } from "@/components/admin/TopBar";
import { ClubStatusBadge } from "@/components/admin/ClubStatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";

interface Club {
  id: string;
  nom: string;
  ville: string;
  maitre_salle?: { nom: string; prenom: string };
  nb_athletes?: number;
  statut: "en_attente" | "valide" | "suspendu" | "refuse";
}

type ActionType = "validate" | "reject" | "suspend" | null;

export default function ClubsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [motif, setMotif] = useState("");

  const { data: clubs, isLoading } = useQuery<Club[]>({
    queryKey: ["clubs"],
    queryFn: async () => {
      const res = await api.get("/clubs");
      return res.data.data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: ActionType }) => {
      if (type === "validate") return api.put(`/admin/clubs/${id}/validate`);
      if (type === "reject") return api.put(`/admin/clubs/${id}/reject`, { motif });
      if (type === "suspend") return api.put(`/admin/clubs/${id}/suspend`);
    },
    onSuccess: () => {
      const labels = { validate: "validé", reject: "refusé", suspend: "suspendu" };
      toast.success(`Club ${labels[actionType!] ?? "mis à jour"}`);
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      queryClient.invalidateQueries({ queryKey: ["pending-clubs"] });
      setSelectedClub(null);
      setActionType(null);
      setMotif("");
    },
    onError: () => toast.error("Une erreur est survenue"),
  });

  const openAction = (club: Club, type: ActionType) => {
    setSelectedClub(club);
    setActionType(type);
  };

  const filtered = (clubs ?? []).filter((c) => {
    const matchSearch =
      c.nom.toLowerCase().includes(search.toLowerCase()) ||
      c.ville.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "tous" || c.statut === statusFilter;
    return matchSearch && matchStatus;
  });

  const dialogTitle = {
    validate: "Valider le club",
    reject: "Refuser le club",
    suspend: "Suspendre le club",
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Clubs" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted" />
            <Input
              placeholder="Rechercher un club…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-brand-surface border-brand-border text-white placeholder:text-brand-muted"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-brand-muted" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] bg-brand-surface border-brand-border text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-brand-surface border-brand-border text-white">
                <SelectItem value="tous">Tous les statuts</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="valide">Validés</SelectItem>
                <SelectItem value="suspendu">Suspendus</SelectItem>
                <SelectItem value="refuse">Refusés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg bg-brand-black" />
              ))}
            </div>
          ) : !filtered.length ? (
            <EmptyState message="Aucun club trouvé" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Club</th>
                    <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Ville</th>
                    <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Maître</th>
                    <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Athlètes</th>
                    <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Statut</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((club) => (
                    <tr key={club.id} className="border-b border-brand-border/50 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3 text-white text-sm font-medium">{club.nom}</td>
                      <td className="px-5 py-3 text-brand-muted text-sm">{club.ville}</td>
                      <td className="px-5 py-3 text-brand-muted text-sm">
                        {club.maitre_salle ? `${club.maitre_salle.prenom} ${club.maitre_salle.nom}` : "—"}
                      </td>
                      <td className="px-5 py-3 text-brand-muted text-sm">{club.nb_athletes ?? 0}</td>
                      <td className="px-5 py-3">
                        <ClubStatusBadge status={club.statut} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          {club.statut === "en_attente" && (
                            <>
                              <Button size="sm" onClick={() => openAction(club, "validate")}
                                className="bg-brand-green hover:bg-brand-green-light text-white h-7 px-2.5 text-xs">
                                <CheckCircle2 className="size-3 mr-1" />Valider
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openAction(club, "reject")}
                                className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-7 px-2.5 text-xs">
                                <XCircle className="size-3 mr-1" />Refuser
                              </Button>
                            </>
                          )}
                          {club.statut === "valide" && (
                            <Button size="sm" variant="outline" onClick={() => openAction(club, "suspend")}
                              className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 h-7 px-2.5 text-xs">
                              <PauseCircle className="size-3 mr-1" />Suspendre
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!selectedClub && !!actionType}
        onOpenChange={(open) => { if (!open) { setSelectedClub(null); setActionType(null); } }}
        title={actionType ? dialogTitle[actionType] : ""}
        description={`Voulez-vous ${actionType === "validate" ? "valider" : actionType === "reject" ? "refuser" : "suspendre"} le club "${selectedClub?.nom}" ?`}
        variant={actionType === "reject" || actionType === "suspend" ? "destructive" : "default"}
        confirmLabel={actionType === "validate" ? "Valider" : actionType === "reject" ? "Refuser" : "Suspendre"}
        loading={actionMutation.isPending}
        onConfirm={() => actionMutation.mutate({ id: selectedClub!.id, type: actionType })}
      >
        {actionType === "reject" && (
          <div className="space-y-2">
            <Label className="text-white">Motif du refus</Label>
            <Input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Documents insuffisants…"
              className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
