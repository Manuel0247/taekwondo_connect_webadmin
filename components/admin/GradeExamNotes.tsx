"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardCheck, Loader2, Flag } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { GradeChip } from "@/components/admin/GradeChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

export interface NoteInscription {
  id: string;
  prenom: string;
  nom: string;
  grade: string | null;
  dan?: number | null;
  note: number | null;
}

function apiErrorMessage(err: unknown): string {
  return (err as { response?: { data?: { error?: { message?: string } } } })
    ?.response?.data?.error?.message ?? "Une erreur est survenue";
}

/** Texte saisi → note (null si vide) ; undefined si la saisie n'est pas un nombre valide */
function parseNote(text: string): number | null | undefined {
  const t = text.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 1000 ? n : undefined;
}

export function GradeExamNotes({
  eventId,
  eventStatut,
  inscriptions,
}: {
  eventId: string;
  eventStatut: string;
  inscriptions: NoteInscription[];
}) {
  const queryClient = useQueryClient();
  // Saisie en cours, par inscription (texte brut du champ)
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [terminateOpen, setTerminateOpen] = useState(false);

  const termine = eventStatut === "termine";
  const editable = termine || eventStatut === "publie";

  const invalides = Object.entries(draft).filter(([, text]) => parseNote(text) === undefined);
  const changes = Object.entries(draft)
    .map(([iid, text]) => ({ inscription_id: iid, note: parseNote(text) }))
    .filter((c): c is { inscription_id: string; note: number | null } =>
      c.note !== undefined && inscriptions.find((i) => i.id === c.inscription_id)?.note !== c.note);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["event-inscriptions", eventId] });
    queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/events/${eventId}/notes`, { notes: changes }),
    onSuccess: (res) => {
      toast.success(res.data.message ?? "Notes enregistrées");
      setDraft({});
      refresh();
    },
    onError: (err) => toast.error("Enregistrement impossible", { description: apiErrorMessage(err) }),
  });

  const terminateMutation = useMutation({
    mutationFn: async () => {
      // Les notes non enregistrées sont sauvegardées avant la clôture
      if (changes.length > 0) await api.put(`/events/${eventId}/notes`, { notes: changes });
      return api.put(`/events/${eventId}/terminate`);
    },
    onSuccess: () => {
      toast.success("Passage de grade clôturé");
      setDraft({});
      setTerminateOpen(false);
      refresh();
    },
    onError: (err) => toast.error("Clôture impossible", { description: apiErrorMessage(err) }),
  });

  const sansNote = inscriptions.filter((i) => {
    const text = draft[i.id];
    return text === undefined ? i.note == null : parseNote(text) == null;
  }).length;

  return (
    <div className="bg-brand-surface rounded-xl border border-brand-border">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-brand-border flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-4 text-brand-orange" />
          <h3 className="text-white font-semibold">Notes de l&apos;examen</h3>
        </div>
        {editable && inscriptions.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={changes.length === 0 || invalides.length > 0 || saveMutation.isPending}
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
                disabled={invalides.length > 0}
                className="border-brand-green/50 text-brand-green-light hover:bg-brand-green/10 h-8 px-3 text-xs"
              >
                <Flag className="size-3.5 mr-1" />Clôturer le passage de grade
              </Button>
            )}
          </div>
        )}
      </div>

      <p className="px-5 pt-4 text-brand-muted text-xs leading-relaxed">
        {!editable
          ? "Publiez l'événement pour saisir les notes."
          : "Saisissez la note de chaque athlète confirmé. Les notes restent modifiables après la clôture et n'ont pas d'effet sur le classement."}
      </p>

      {inscriptions.length === 0 ? (
        <p className="px-5 py-6 text-brand-muted text-sm">Aucun athlète confirmé pour ce passage de grade.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full mt-2">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Athlète</th>
                <th className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Grade</th>
                <th className="text-right px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">Note</th>
              </tr>
            </thead>
            <tbody>
              {inscriptions.map((insc) => {
                const text = draft[insc.id] ?? (insc.note != null ? String(insc.note) : "");
                const parsed = draft[insc.id] !== undefined ? parseNote(draft[insc.id]) : insc.note;
                const invalide = parsed === undefined;
                const modifie = !invalide && draft[insc.id] !== undefined && parsed !== insc.note;
                return (
                  <tr key={insc.id} className="border-b border-brand-border/50">
                    <td className="px-5 py-3 text-white text-sm font-medium">{insc.prenom} {insc.nom}</td>
                    <td className="px-5 py-3">{insc.grade ? <GradeChip grade={insc.grade as Parameters<typeof GradeChip>[0]["grade"]} dan={insc.dan} /> : <span className="text-brand-muted text-sm">—</span>}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        <Input
                          inputMode="decimal"
                          value={text}
                          placeholder="—"
                          disabled={!editable}
                          onChange={(e) => setDraft((prev) => ({ ...prev, [insc.id]: e.target.value }))}
                          className={`w-24 h-8 text-right bg-brand-black border-brand-border text-white text-sm ${
                            invalide ? "border-red-500" : modifie ? "border-brand-orange" : ""
                          }`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {invalides.length > 0 && (
            <p className="px-5 py-3 text-red-400 text-xs">Une note doit être un nombre entre 0 et 1000.</p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={terminateOpen}
        onOpenChange={setTerminateOpen}
        title="Clôturer le passage de grade"
        description={
          sansNote > 0
            ? `${sansNote} athlète${sansNote > 1 ? "s n'ont" : " n'a"} pas encore de note. Vous pourrez la saisir après la clôture. Continuer ?`
            : "Les inscriptions ne pourront plus être modifiées. Continuer ?"
        }
        confirmLabel="Clôturer"
        loading={terminateMutation.isPending}
        onConfirm={() => terminateMutation.mutate()}
      />
    </div>
  );
}
