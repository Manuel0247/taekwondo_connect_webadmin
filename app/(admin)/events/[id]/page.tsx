"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Calendar, MapPin, Users, Clock,
  Mail, Weight, CheckCircle2, XCircle, Loader2, Ban,
} from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { GradeChip } from "@/components/admin/GradeChip";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

/* ── Types ── */
type EventStatus       = "brouillon" | "publie" | "annule";
type InscriptionStatus = "propose" | "en_attente" | "confirme" | "refuse" | "annule";

interface Inscription {
  id:              string;
  statut:          InscriptionStatus;
  commentaire:     string | null;
  prenom:          string;
  nom:             string;
  email:           string | null;
  grade:           string | null;
  categorie_poids: string | null;
  numero_licence:  string | null;
}

/* ── Config ── */
const eventStatusConfig: Record<EventStatus, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
  publie:    { label: "Publié",    className: "bg-brand-green/15 text-brand-green-light border-brand-green/30" },
  annule:    { label: "Annulé",   className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

const inscStatusConfig: Record<InscriptionStatus, { label: string; className: string }> = {
  propose:    { label: "Proposé",    className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  en_attente: { label: "En attente", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  confirme:   { label: "Confirmé",   className: "bg-brand-green/15 text-brand-green-light border-brand-green/30" },
  refuse:     { label: "Refusé",     className: "bg-red-500/15 text-red-400 border-red-500/30" },
  annule:     { label: "Annulé",    className: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
};

// All statuses that can still be actioned (annule is terminal)
const ACTIONNABLE: InscriptionStatus[] = ["propose", "en_attente", "confirme", "refuse"];

/* ── Normalize ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(raw: any): Inscription {
  const athlete = raw.athlete ?? {};
  const user    = athlete.user ?? {};
  return {
    id:              raw.id,
    statut:          raw.statut as InscriptionStatus,
    commentaire:     raw.commentaire ?? null,
    prenom:          user.prenom   ?? athlete.prenom   ?? "—",
    nom:             user.nom      ?? athlete.nom      ?? "—",
    email:           user.email    ?? athlete.email    ?? null,
    grade:           athlete.grade ?? null,
    categorie_poids: athlete.categorie_poids ?? null,
    numero_licence:  athlete.numero_licence  ?? null,
  };
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  /* ── Selection ── */
  const [selected,    setSelected]    = useState<Set<string>>(new Set());

  /* ── Single reject dialog ── */
  const [rejectTarget,      setRejectTarget]      = useState<Inscription | null>(null);
  const [singleRejectMotif, setSingleRejectMotif] = useState("");

  /* ── Bulk reject dialog ── */
  const [rejectOpen,  setRejectOpen]  = useState(false);
  const [rejectMotif, setRejectMotif] = useState("");
  const [bulkPending, setBulkPending] = useState(false);

  /* ── Bulk cancel confirm dialog ── */
  const [cancelOpen,  setCancelOpen]  = useState(false);

  /* ── Queries ── */
  const { data: ev, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => (await api.get(`/events/${id}`)).data.data,
  });

  const { data: inscriptions = [], isLoading: inscLoading } = useQuery<Inscription[]>({
    queryKey: ["event-inscriptions", id],
    queryFn: async () => {
      const res = await api.get(`/events/${id}/inscriptions`);
      const list = res.data.data ?? [];
      return Array.isArray(list) ? list.map(normalize) : [];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["event-inscriptions", id] });

  /* ── Single mutations ── */
  const confirmOne = useMutation({
    mutationFn: (iid: string) => api.put(`/events/${id}/inscriptions/${iid}/confirm`),
    onSuccess: () => { toast.success("Inscription confirmée"); invalidate(); },
    onError:   () => toast.error("Erreur lors de la confirmation"),
  });

  const rejectOne = useMutation({
    mutationFn: ({ iid, motif }: { iid: string; motif: string }) =>
      api.put(`/events/${id}/inscriptions/${iid}/reject`, { motif }),
    onSuccess: () => { toast.success("Inscription refusée"); invalidate(); },
    onError:   () => toast.error("Erreur lors du refus"),
  });

  const cancelOne = useMutation({
    mutationFn: (iid: string) => api.delete(`/events/${id}/inscriptions/${iid}`),
    onSuccess: () => { toast.success("Inscription annulée"); invalidate(); },
    onError:   () => toast.error("Erreur lors de l'annulation"),
  });

  /* ── Derived selection ── */
  const actionableIds  = inscriptions.filter((i) => ACTIONNABLE.includes(i.statut)).map((i) => i.id);
  const selectedList   = inscriptions.filter((i) => selected.has(i.id));

  // Which selected can be confirmed (not yet confirmed)
  const canConfirmSel  = selectedList.filter((i) => i.statut !== "confirme" && i.statut !== "annule");
  // Which selected can be rejected (not yet refused/annulé)
  const canRejectSel   = selectedList.filter((i) => i.statut !== "refuse" && i.statut !== "annule");
  // Which selected can be cancelled (not already annulé)
  const canCancelSel   = selectedList.filter((i) => i.statut !== "annule");

  const allSelected = actionableIds.length > 0 && actionableIds.every((iid) => selected.has(iid));

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(actionableIds));

  const toggleOne = (iid: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(iid) ? next.delete(iid) : next.add(iid);
      return next;
    });

  /* ── Bulk helpers ── */
  const runBulk = async (
    items: Inscription[],
    fn: (i: Inscription) => Promise<unknown>,
    labels: { ok: (n: number) => string; err: (n: number) => string },
  ) => {
    setBulkPending(true);
    const results = await Promise.allSettled(items.map(fn));
    const ok  = results.filter((r) => r.status === "fulfilled").length;
    const err = results.filter((r) => r.status === "rejected").length;
    if (ok)  toast.success(labels.ok(ok));
    if (err) toast.error(labels.err(err));
    invalidate();
    setSelected(new Set());
    setBulkPending(false);
  };

  const bulkConfirm = () =>
    runBulk(
      canConfirmSel,
      (i) => api.put(`/events/${id}/inscriptions/${i.id}/confirm`),
      {
        ok:  (n) => `${n} inscription${n > 1 ? "s" : ""} confirmée${n > 1 ? "s" : ""}`,
        err: (n) => `${n} échec${n > 1 ? "s" : ""} lors de la confirmation`,
      },
    );

  const bulkReject = async () => {
    if (!rejectMotif.trim()) return;
    await runBulk(
      canRejectSel,
      (i) => api.put(`/events/${id}/inscriptions/${i.id}/reject`, { motif: rejectMotif }),
      {
        ok:  (n) => `${n} inscription${n > 1 ? "s" : ""} refusée${n > 1 ? "s" : ""}`,
        err: (n) => `${n} échec${n > 1 ? "s" : ""} lors du refus`,
      },
    );
    setRejectOpen(false);
    setRejectMotif("");
  };

  const bulkCancel = () =>
    runBulk(
      canCancelSel,
      (i) => api.delete(`/events/${id}/inscriptions/${i.id}`),
      {
        ok:  (n) => `${n} inscription${n > 1 ? "s" : ""} annulée${n > 1 ? "s" : ""}`,
        err: (n) => `${n} échec${n > 1 ? "s" : ""} lors de l'annulation`,
      },
    );

  /* ── Derived stats ── */
  const evStatusCfg = eventStatusConfig[(ev?.statut ?? "brouillon") as EventStatus] ?? eventStatusConfig.brouillon;
  const stats = {
    total:     inscriptions.length,
    confirmes: inscriptions.filter((i) => i.statut === "confirme").length,
    attente:   inscriptions.filter((i) => i.statut === "propose" || i.statut === "en_attente").length,
    refuses:   inscriptions.filter((i) => i.statut === "refuse").length,
    annules:   inscriptions.filter((i) => i.statut === "annule").length,
  };

  /* ── Render ── */
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Détail Événement" />
      <div className="flex-1 overflow-y-auto p-6">
        <Link href="/events"
          className="inline-flex items-center gap-1.5 text-brand-muted hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="size-4" />Retour aux événements
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl bg-brand-surface" />
            <Skeleton className="h-64 rounded-xl bg-brand-surface" />
          </div>
        ) : !ev ? (
          <p className="text-brand-muted">Événement introuvable</p>
        ) : (
          <div className="space-y-5">
            {/* ── Infos événement ── */}
            <div className="bg-brand-surface rounded-xl border border-brand-border p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <h2 className="text-white text-2xl font-bold">{ev.titre}</h2>
                  {ev.type && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-brand-orange/15 text-brand-orange border border-brand-orange/30">
                      {ev.type.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border shrink-0", evStatusCfg.className)}>
                  {evStatusCfg.label}
                </span>
              </div>
              {ev.description && <p className="text-brand-muted text-sm mt-3 leading-relaxed">{ev.description}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
                <InfoItem icon={Calendar} label="Début"  value={new Date(ev.date_debut).toLocaleString("fr-FR")} />
                {ev.date_fin && <InfoItem icon={Clock}   label="Fin"    value={new Date(ev.date_fin).toLocaleString("fr-FR")} />}
                <InfoItem icon={MapPin}   label="Lieu"   value={ev.adresse ?? ev.lieu ?? "—"} />
                <InfoItem icon={Users}    label="Places" value={`${ev.places_total ?? "—"} places`} />
              </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatPill label="Total"      value={stats.total}     color="text-white" />
              <StatPill label="Confirmés"  value={stats.confirmes} color="text-brand-green-light" />
              <StatPill label="En attente" value={stats.attente}   color="text-yellow-400" />
              <StatPill label="Refusés"    value={stats.refuses}   color="text-red-400" />
              <StatPill label="Annulés"    value={stats.annules}   color="text-brand-muted" />
            </div>

            {/* ── Table inscriptions ── */}
            <div className="bg-brand-surface rounded-xl border border-brand-border">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border gap-3">
                <h3 className="text-white font-semibold">Athlètes inscrits</h3>
                {inscriptions.length > 0 && (
                  <span className="text-brand-muted text-sm">
                    {inscriptions.length} inscription{inscriptions.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Bulk action bar */}
              {selected.size > 0 && (
                <div className="flex items-center gap-2 px-5 py-3 bg-brand-orange/10 border-b border-brand-orange/20 flex-wrap">
                  <span className="text-brand-orange text-sm font-medium shrink-0">
                    {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-2 ml-auto flex-wrap">
                    {/* Bulk confirm */}
                    <Button size="sm" onClick={bulkConfirm}
                      disabled={bulkPending || canConfirmSel.length === 0}
                      className="bg-brand-green hover:bg-brand-green-light text-white h-8 px-3 text-xs">
                      {bulkPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <CheckCircle2 className="size-3.5 mr-1" />}
                      Confirmer ({canConfirmSel.length})
                    </Button>
                    {/* Bulk reject */}
                    <Button size="sm" variant="outline"
                      onClick={() => { setRejectMotif(""); setRejectOpen(true); }}
                      disabled={bulkPending || canRejectSel.length === 0}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8 px-3 text-xs">
                      <XCircle className="size-3.5 mr-1" />
                      Refuser ({canRejectSel.length})
                    </Button>
                    {/* Bulk cancel */}
                    <Button size="sm" variant="outline"
                      onClick={() => setCancelOpen(true)}
                      disabled={bulkPending || canCancelSel.length === 0}
                      className="border-gray-500/50 text-gray-400 hover:bg-gray-500/10 h-8 px-3 text-xs">
                      <Ban className="size-3.5 mr-1" />
                      Annuler ({canCancelSel.length})
                    </Button>
                    <button onClick={() => setSelected(new Set())}
                      className="text-brand-muted hover:text-white text-xs underline ml-1 shrink-0">
                      Désélectionner
                    </button>
                  </div>
                </div>
              )}

              {inscLoading ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg bg-brand-black" />)}
                </div>
              ) : !inscriptions.length ? (
                <div className="flex items-center justify-center py-12 text-brand-muted text-sm">
                  Aucune inscription pour cet événement
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-brand-border">
                        <th className="px-5 py-3 w-10">
                          {actionableIds.length > 0 && (
                            <input type="checkbox" checked={allSelected} onChange={toggleAll}
                              className="rounded border-brand-border bg-brand-black accent-brand-orange cursor-pointer" />
                          )}
                        </th>
                        {["Athlète", "Grade", "Catégorie", "Licence", "Statut", ""].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {inscriptions.map((insc) => {
                        const sCfg      = inscStatusConfig[insc.statut] ?? inscStatusConfig.en_attente;
                        const canAction = ACTIONNABLE.includes(insc.statut);
                        const isChecked = selected.has(insc.id);
                        const busy      = confirmOne.isPending || rejectOne.isPending || cancelOne.isPending;

                        return (
                          <tr key={insc.id}
                            className={cn(
                              "border-b border-brand-border/50 transition-colors",
                              isChecked ? "bg-brand-orange/5" : "hover:bg-white/2"
                            )}>
                            {/* Checkbox */}
                            <td className="px-5 py-3">
                              {canAction && (
                                <input type="checkbox" checked={isChecked} onChange={() => toggleOne(insc.id)}
                                  className="rounded border-brand-border bg-brand-black accent-brand-orange cursor-pointer" />
                              )}
                            </td>

                            {/* Athlète */}
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange text-xs font-bold shrink-0">
                                  {(insc.prenom[0] ?? "?").toUpperCase()}{(insc.nom[0] ?? "?").toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-white text-sm font-medium">{insc.prenom} {insc.nom}</p>
                                  {insc.email && (
                                    <div className="flex items-center gap-1 text-brand-muted text-xs">
                                      <Mail className="size-3" />{insc.email}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Grade */}
                            <td className="px-5 py-3">
                              {insc.grade
                                ? <GradeChip grade={insc.grade as Parameters<typeof GradeChip>[0]["grade"]} />
                                : <span className="text-brand-muted text-sm">—</span>}
                            </td>

                            {/* Catégorie */}
                            <td className="px-5 py-3">
                              {insc.categorie_poids
                                ? <div className="flex items-center gap-1.5 text-brand-muted text-sm"><Weight className="size-3.5" />{insc.categorie_poids}</div>
                                : <span className="text-brand-muted text-sm">—</span>}
                            </td>

                            {/* Licence */}
                            <td className="px-5 py-3 text-brand-muted text-sm font-mono">
                              {insc.numero_licence ?? "—"}
                            </td>

                            {/* Statut */}
                            <td className="px-5 py-3">
                              <div className="space-y-1">
                                <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium border", sCfg.className)}>
                                  {sCfg.label}
                                </span>
                                {insc.commentaire && (
                                  <p className="text-brand-muted text-xs italic">{insc.commentaire}</p>
                                )}
                              </div>
                            </td>

                            {/* Actions individuelles — contextuelles selon le statut */}
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1.5 justify-end">
                                {/* propose / en_attente → Confirmer + Refuser */}
                                {(insc.statut === "propose" || insc.statut === "en_attente") && (
                                  <>
                                    <Button size="sm" onClick={() => confirmOne.mutate(insc.id)} disabled={busy}
                                      className="bg-brand-green hover:bg-brand-green-light text-white h-7 px-2.5 text-xs">
                                      {confirmOne.isPending ? <Loader2 className="size-3 animate-spin" /> : <><CheckCircle2 className="size-3 mr-1" />Confirmer</>}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => { setSingleRejectMotif(""); setRejectTarget(insc); }} disabled={busy}
                                      className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-7 px-2.5 text-xs">
                                      <XCircle className="size-3 mr-1" />Refuser
                                    </Button>
                                  </>
                                )}
                                {/* confirme → Refuser + Annuler */}
                                {insc.statut === "confirme" && (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => { setSingleRejectMotif(""); setRejectTarget(insc); }} disabled={busy}
                                      className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-7 px-2.5 text-xs">
                                      <XCircle className="size-3 mr-1" />Refuser
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => cancelOne.mutate(insc.id)} disabled={busy}
                                      className="border-gray-500/50 text-gray-400 hover:bg-gray-500/10 h-7 px-2.5 text-xs">
                                      {cancelOne.isPending ? <Loader2 className="size-3 animate-spin" /> : <><Ban className="size-3 mr-1" />Annuler</>}
                                    </Button>
                                  </>
                                )}
                                {/* refuse → Confirmer + Annuler */}
                                {insc.statut === "refuse" && (
                                  <>
                                    <Button size="sm" onClick={() => confirmOne.mutate(insc.id)} disabled={busy}
                                      className="bg-brand-green hover:bg-brand-green-light text-white h-7 px-2.5 text-xs">
                                      {confirmOne.isPending ? <Loader2 className="size-3 animate-spin" /> : <><CheckCircle2 className="size-3 mr-1" />Confirmer</>}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => cancelOne.mutate(insc.id)} disabled={busy}
                                      className="border-gray-500/50 text-gray-400 hover:bg-gray-500/10 h-7 px-2.5 text-xs">
                                      <Ban className="size-3 mr-1" />Annuler
                                    </Button>
                                  </>
                                )}
                                {/* annule → rien */}
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
        )}
      </div>

      {/* ── Dialog refus individuel ── */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setSingleRejectMotif(""); } }}>
        <DialogContent className="bg-brand-surface border-brand-border text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <XCircle className="size-5 text-red-400" />
              Refuser l&apos;inscription
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {rejectTarget && (
              <div className="flex items-center gap-3 bg-brand-black rounded-lg px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange text-xs font-bold shrink-0">
                  {(rejectTarget.prenom[0] ?? "?").toUpperCase()}{(rejectTarget.nom[0] ?? "?").toUpperCase()}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{rejectTarget.prenom} {rejectTarget.nom}</p>
                  {rejectTarget.email && <p className="text-brand-muted text-xs">{rejectTarget.email}</p>}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-white">Motif du refus <span className="text-red-400">*</span></Label>
              <Input
                value={singleRejectMotif}
                onChange={(e) => setSingleRejectMotif(e.target.value)}
                placeholder="Places insuffisantes, critères non remplis…"
                className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => { setRejectTarget(null); setSingleRejectMotif(""); }}
                disabled={rejectOne.isPending}
                className="flex-1 border-brand-border text-brand-muted hover:text-white">
                Annuler
              </Button>
              <Button
                onClick={() => {
                  if (!singleRejectMotif.trim() || !rejectTarget) return;
                  rejectOne.mutate(
                    { iid: rejectTarget.id, motif: singleRejectMotif },
                    { onSuccess: () => { setRejectTarget(null); setSingleRejectMotif(""); } }
                  );
                }}
                disabled={!singleRejectMotif.trim() || rejectOne.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {rejectOne.isPending ? <Loader2 className="size-4 animate-spin" /> : "Refuser"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog refus groupé ── */}
      <Dialog open={rejectOpen} onOpenChange={(o) => { if (!o && !bulkPending) { setRejectOpen(false); setRejectMotif(""); } }}>
        <DialogContent className="bg-brand-surface border-brand-border text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <XCircle className="size-5 text-red-400" />
              Refuser {canRejectSel.length} inscription{canRejectSel.length > 1 ? "s" : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-brand-muted text-sm">Ce motif sera appliqué à toutes les inscriptions sélectionnées.</p>
            <div className="space-y-1.5">
              <Label className="text-white">Motif du refus <span className="text-red-400">*</span></Label>
              <Input value={rejectMotif} onChange={(e) => setRejectMotif(e.target.value)}
                placeholder="Places insuffisantes, critères non remplis…"
                className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted" autoFocus />
            </div>
            {canRejectSel.length > 0 && (
              <div className="bg-brand-black rounded-lg px-4 py-3 space-y-1 max-h-40 overflow-y-auto">
                {canRejectSel.map((i) => (
                  <div key={i.id} className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange text-[10px] font-bold shrink-0">
                      {(i.prenom[0] ?? "?").toUpperCase()}
                    </div>
                    <span className="text-white">{i.prenom} {i.nom}</span>
                    <span className={cn("ml-auto text-xs px-1.5 py-0.5 rounded-full border", inscStatusConfig[i.statut].className)}>
                      {inscStatusConfig[i.statut].label}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => { setRejectOpen(false); setRejectMotif(""); }} disabled={bulkPending}
                className="flex-1 border-brand-border text-brand-muted hover:text-white">Annuler</Button>
              <Button onClick={bulkReject} disabled={!rejectMotif.trim() || bulkPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                {bulkPending ? <Loader2 className="size-4 animate-spin" /> : `Refuser (${canRejectSel.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm annulation groupée ── */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={(o) => { if (!o) setCancelOpen(false); }}
        title={`Annuler ${canCancelSel.length} inscription${canCancelSel.length > 1 ? "s" : ""}`}
        description={`Cette action est irréversible. Les ${canCancelSel.length} inscription${canCancelSel.length > 1 ? "s" : ""} sélectionnée${canCancelSel.length > 1 ? "s" : ""} passeront au statut "Annulé". Les places confirmées seront libérées.`}
        variant="destructive"
        confirmLabel={`Annuler (${canCancelSel.length})`}
        loading={bulkPending}
        onConfirm={() => { setCancelOpen(false); bulkCancel(); }}
      />
    </div>
  );
}

/* ── Helpers ── */
function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="size-4 text-brand-orange shrink-0 mt-0.5" />
      <div>
        <p className="text-brand-muted text-xs">{label}</p>
        <p className="text-white text-sm">{value}</p>
      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-brand-surface rounded-xl border border-brand-border px-4 py-3">
      <p className="text-brand-muted text-xs">{label}</p>
      <p className={cn("text-2xl font-bold mt-0.5", color)}>{value}</p>
    </div>
  );
}
