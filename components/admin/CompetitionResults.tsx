"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trophy, Loader2, Flag } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { GradeChip } from "@/components/admin/GradeChip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";

export type Resultat = "or" | "argent" | "bronze" | "participant";

export interface ResultInscription {
  id: string;
  prenom: string;
  nom: string;
  grade: string | null;
  dan?: number | null;
  categorie_poids: string | null;
  resultat: Resultat | null;
  points: number | null;
}

// Même barème que RankingService::pointsPour côté API (points par catégorie de classement)
const RESULTATS: { value: Resultat; label: string; points: number }[] = [
  { value: "or",          label: "🥇 Or",        points: 100 },
  { value: "argent",      label: "🥈 Argent",    points: 75 },
  { value: "bronze",      label: "🥉 Bronze",    points: 50 },
  { value: "participant", label: "Participant",  points: 10 },
];

function apiErrorMessage(err: unknown): string {
  return (err as { response?: { data?: { error?: { message?: string } } } })
    ?.response?.data?.error?.message ?? "Une erreur est survenue";
}

export function CompetitionResults({
  eventId,
  eventStatut,
  inscriptions,
}: {
  eventId: string;
  eventStatut: string;
  inscriptions: ResultInscription[];
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, Resultat>>({});
  const [terminateOpen, setTerminateOpen] = useState(false);

  const termine = eventStatut === "termine";
  const editable = termine || eventStatut === "publie";

  const changes = Object.entries(draft).filter(
    ([iid, resultat]) => inscriptions.find((i) => i.id === iid)?.resultat !== resultat,
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["event-inscriptions", eventId] });
    queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put(`/events/${eventId}/resultats`, {
        resultats: changes.map(([inscription_id, resultat]) => ({ inscription_id, resultat })),
      }),
    onSuccess: (res) => {
      toast.success(res.data.message ?? "Résultats enregistrés");
      setDraft({});
      refresh();
    },
    onError: (err) => toast.error("Enregistrement impossible", { description: apiErrorMessage(err) }),
  });

  const terminateMutation = useMutation({
    mutationFn: async () => {
      // Les résultats non enregistrés sont sauvegardés avant la clôture pour être pris en compte
      if (changes.length > 0) {
        await api.put(`/events/${eventId}/resultats`, {
          resultats: changes.map(([inscription_id, resultat]) => ({ inscription_id, resultat })),
        });
      }
      return api.put(`/events/${eventId}/terminate`);
    },
    onSuccess: () => {
      toast.success("Compétition clôturée, points attribués");
      setDraft({});
      setTerminateOpen(false);
      refresh();
    },
    onError: (err) => toast.error("Clôture impossible", { description: apiErrorMessage(err) }),
  });

  const sansResultat = inscriptions.filter((i) => !(draft[i.id] ?? i.resultat)).length;

  return (
    <div className="bg-brand-surface rounded-xl border border-brand-border">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-brand-border flex-wrap">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-brand-orange" />
          <h3 className="text-white font-semibold">Résultats de la compétition</h3>
        </div>
        {editable && inscriptions.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={changes.length === 0 || saveMutation.isPending}
              className="bg-brand-orange hover:bg-brand-orange-light text-white h-8 px-3 text-xs"
            >
              {saveMutation.isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}
              Enregistrer{changes.length > 0 ? ` (${changes.length})` : ""}
            </Button>
            {!termine && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTerminateOpen(true)}
                className="border-brand-green/50 text-brand-green-light hover:bg-brand-green/10 h-8 px-3 text-xs"
              >
                <Flag className="size-3.5 mr-1" />Clôturer et attribuer les points
              </Button>
            )}
          </div>
        )}
      </div>

      <p className="px-5 pt-4 text-brand-muted text-xs leading-relaxed">
        {!editable
          ? "Publiez l'événement pour saisir les résultats."
          : termine
            ? "Compétition terminée : modifier un résultat met à jour le classement (seul l'écart de points est appliqué)."
            : "Les points sont attribués à la clôture. Sans résultat saisi, un athlète confirmé compte comme participant."}
      </p>

      {inscriptions.length === 0 ? (
        <p className="px-5 py-6 text-brand-muted text-sm">Aucun athlète confirmé pour cette compétition.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full mt-2">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Athlète</th>
                <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Grade</th>
                <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Poids</th>
                <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Résultat</th>
                <th className="text-right px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Points</th>
              </tr>
            </thead>
            <tbody>
              {inscriptions.map((insc) => {
                const value = draft[insc.id] ?? insc.resultat ?? undefined;
                const modifie = draft[insc.id] !== undefined && draft[insc.id] !== insc.resultat;
                return (
                  <tr key={insc.id} className="border-b border-brand-border/50">
                    <td className="px-5 py-3 text-white text-sm font-medium">{insc.prenom} {insc.nom}</td>
                    <td className="px-5 py-3">{insc.grade ? <GradeChip grade={insc.grade as Parameters<typeof GradeChip>[0]["grade"]} dan={insc.dan} /> : <span className="text-brand-muted text-sm">—</span>}</td>
                    <td className="px-5 py-3 text-brand-muted text-sm">{insc.categorie_poids ?? "—"}</td>
                    <td className="px-5 py-3">
                      <Select
                        value={value}
                        onValueChange={(v) => setDraft((prev) => ({ ...prev, [insc.id]: v as Resultat }))}
                        disabled={!editable}
                      >
                        <SelectTrigger className={`w-[150px] h-8 bg-brand-black border-brand-border text-white text-xs ${modifie ? "border-brand-orange" : ""}`}>
                          <SelectValue placeholder="Non saisi" />
                        </SelectTrigger>
                        <SelectContent className="bg-brand-surface border-brand-border text-white">
                          {RESULTATS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-3 text-right text-sm">
                      {insc.points != null
                        ? <span className="text-brand-green-light font-semibold">{insc.points} pts</span>
                        : <span className="text-brand-muted">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={terminateOpen}
        onOpenChange={setTerminateOpen}
        title="Clôturer la compétition"
        description={
          sansResultat > 0
            ? `${sansResultat} athlète${sansResultat > 1 ? "s n'ont" : " n'a"} pas de résultat et ${sansResultat > 1 ? "seront comptés" : "sera compté"} comme participant (10 pts). Les points seront ajoutés au classement. Continuer ?`
            : "Les points seront ajoutés au classement de chaque athlète. Continuer ?"
        }
        confirmLabel="Clôturer"
        loading={terminateMutation.isPending}
        onConfirm={() => terminateMutation.mutate()}
      />
    </div>
  );
}
