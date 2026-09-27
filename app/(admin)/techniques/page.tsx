
"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Loader2, Video, UploadCloud, Play, X, Link2 } from "lucide-react";
import { TopBar } from "@/components/admin/TopBar";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const schema = z.object({
  nom_fr:     z.string().min(1),
  nom_korean: z.string().optional(),
  discipline: z.enum(["taekwondo_sport", "taekwondo_traditionnel", "poomsae", "self_defense"]),
  niveau:     z.enum(["debutant", "intermediaire", "avance"]),
  type:       z.enum(["coup_de_pied", "coup_de_poing", "blocage", "deplacement", "poomsae"]),
});
type FormData = z.infer<typeof schema>;

interface Technique {
  id: string;
  nom_fr: string;
  nom_korean?: string;
  discipline: string;
  niveau: string;
  type: string;
  video_url?: string;
  illustration_url?: string;
}

const niveauColors: Record<string, string> = {
  debutant:      "bg-green-500/15 text-green-400 border-green-500/30",
  intermediaire: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  avance:        "bg-red-500/15 text-red-400 border-red-500/30",
};

const ACCEPT_VIDEO = ".mp4,.webm,video/mp4,video/webm";
const MAX_SIZE_MB  = 200;

export default function TechniquesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── State ───────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTech,     setEditTech]     = useState<Technique | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Technique | null>(null);

  // Video upload dialog
  const [videoTarget,      setVideoTarget]      = useState<Technique | null>(null);
  const [videoMode,        setVideoMode]        = useState<"file" | "url">("file");
  const [videoFile,        setVideoFile]        = useState<File | null>(null);
  const [videoUrl,         setVideoUrl]         = useState("");
  const [uploadProgress,   setUploadProgress]   = useState(0);
  const [uploading,        setUploading]        = useState(false);

  // ─── Query ───────────────────────────────────────────────
  const { data: techniques, isLoading } = useQuery<Technique[]>({
    queryKey: ["techniques"],
    queryFn: async () => {
      const res = await api.get("/techniques");
      const data = res.data.data;
      return Array.isArray(data) ? data : [];
    },
  });

  // ─── Form ────────────────────────────────────────────────
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { discipline: "taekwondo_sport", niveau: "debutant", type: "coup_de_pied" },
  });

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      editTech ? api.put(`/techniques/${editTech.id}`, data) : api.post("/techniques", data),
    onSuccess: () => {
      toast.success(editTech ? "Technique modifiée" : "Technique créée");
      queryClient.invalidateQueries({ queryKey: ["techniques"] });
      setModalOpen(false); setEditTech(null); reset();
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const saveUrlMutation = useMutation({
    mutationFn: ({ id, url }: { id: string; url: string }) =>
      api.put(`/techniques/${id}`, { video_url: url }),
    onSuccess: () => {
      toast.success("Lien vidéo enregistré");
      queryClient.invalidateQueries({ queryKey: ["techniques"] });
      closeVideoDialog();
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/techniques/${id}`),
    onSuccess: () => {
      toast.success("Technique supprimée");
      queryClient.invalidateQueries({ queryKey: ["techniques"] });
      setDeleteTarget(null);
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  // ─── Handlers ────────────────────────────────────────────
  const openCreate = () => { setEditTech(null); reset(); setModalOpen(true); };
  const openEdit   = (t: Technique) => {
    setEditTech(t);
    setValue("nom_fr",     t.nom_fr);
    setValue("nom_korean", t.nom_korean ?? "");
    setValue("discipline", t.discipline as FormData["discipline"]);
    setValue("niveau",     t.niveau     as FormData["niveau"]);
    setValue("type",       t.type       as FormData["type"]);
    setModalOpen(true);
  };

  const openVideoDialog = (t: Technique) => {
    setVideoTarget(t);
    setVideoMode("file");
    setVideoFile(null);
    setVideoUrl("");
    setUploadProgress(0);
  };

  const closeVideoDialog = () => {
    if (uploading) return;
    setVideoTarget(null);
    setVideoFile(null);
    setVideoUrl("");
    setUploadProgress(0);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Fichier trop lourd (max ${MAX_SIZE_MB} Mo)`);
      e.target.value = "";
      return;
    }
    setVideoFile(file);
  };

  const uploadVideo = async () => {
    if (!videoFile || !videoTarget) return;
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("model",      "technique");
    formData.append("model_id",   videoTarget.id);
    formData.append("collection", "video");
    formData.append("file",       videoFile);
    try {
      await api.post("/uploads/video", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      toast.success("Vidéo uploadée avec succès");
      queryClient.invalidateQueries({ queryKey: ["techniques"] });
      closeVideoDialog();
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const filtered = (techniques ?? []).filter((t) =>
    t.nom_fr.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Techniques" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted" />
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-brand-surface border-brand-border text-white placeholder:text-brand-muted"
            />
          </div>
          <Button onClick={openCreate} className="bg-brand-orange hover:bg-brand-orange-light text-white">
            <Plus className="size-4 mr-1.5" />Ajouter
          </Button>
        </div>

        <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg bg-brand-black" />)}
            </div>
          ) : !filtered.length ? <EmptyState message="Aucune technique" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-border">
                    {["Nom", "Coréen", "Discipline", "Niveau", "Type", "Vidéo", ""].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-b border-brand-border/50 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3 text-white text-sm font-medium">{t.nom_fr}</td>
                      <td className="px-5 py-3 text-brand-muted text-sm italic">{t.nom_korean ?? "—"}</td>
                      <td className="px-5 py-3 text-brand-muted text-sm">{t.discipline.replace(/_/g, " ")}</td>
                      <td className="px-5 py-3">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium border", niveauColors[t.niveau] ?? "")}>
                          {t.niveau}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-brand-muted text-sm">{t.type.replace(/_/g, " ")}</td>
                      <td className="px-5 py-3">
                        {t.video_url ? (
                          <a href={t.video_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-brand-green-light text-xs font-medium hover:underline">
                            <Play className="size-3 fill-current" />Voir
                          </a>
                        ) : (
                          <span className="text-brand-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => openVideoDialog(t)}
                            title={t.video_url ? "Remplacer la vidéo" : "Uploader une vidéo"}
                            className={cn("h-7 w-7 p-0", t.video_url ? "text-brand-green-light hover:text-green-300" : "text-brand-muted hover:text-white")}
                          >
                            <Video className="size-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(t)}
                            className="text-brand-muted hover:text-white h-7 w-7 p-0">
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(t)}
                            className="text-brand-muted hover:text-red-400 h-7 w-7 p-0">
                            <Trash2 className="size-3.5" />
                          </Button>
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

      {/* ── Créer / Modifier ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-brand-surface border-brand-border text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editTech ? "Modifier la technique" : "Nouvelle technique"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4 mt-2">
            {([["Nom en français *", "nom_fr", "Coup de pied sauté…"], ["Nom coréen", "nom_korean", "Twio chagi…"]] as const).map(([label, name, ph]) => (
              <div key={name} className="space-y-1.5">
                <Label className="text-white text-sm">{label}</Label>
                <Input
                  placeholder={ph}
                  className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
                  {...register(name as keyof FormData)}
                />
                {errors[name as keyof FormData] && (
                  <p className="text-red-400 text-xs">{errors[name as keyof FormData]?.message as string}</p>
                )}
              </div>
            ))}
            {[
              { label: "Discipline", name: "discipline", options: [["taekwondo_sport","TKD Sport"],["taekwondo_traditionnel","TKD Traditionnel"],["poomsae","Poomsae"],["self_defense","Self-défense"]] },
              { label: "Niveau",     name: "niveau",     options: [["debutant","Débutant"],["intermediaire","Intermédiaire"],["avance","Avancé"]] },
              { label: "Type",       name: "type",       options: [["coup_de_pied","Coup de pied"],["coup_de_poing","Coup de poing"],["blocage","Blocage"],["deplacement","Déplacement"],["poomsae","Poomsae"]] },
            ].map(({ label, name, options }) => (
              <div key={name} className="space-y-1.5">
                <Label className="text-white text-sm">{label}</Label>
                <Select
                  defaultValue={editTech?.[name as keyof Technique] as string ?? options[0][0]}
                  onValueChange={(v) => setValue(name as keyof FormData, v as never)}
                >
                  <SelectTrigger className="bg-brand-black border-brand-border text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-brand-surface border-brand-border text-white">
                    {options.map(([val, lbl]) => <SelectItem key={val} value={val}>{lbl}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <Button type="submit" disabled={saveMutation.isPending}
              className="w-full bg-brand-orange hover:bg-brand-orange-light text-white mt-2">
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : (editTech ? "Enregistrer" : "Créer")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Upload vidéo ── */}
      <Dialog open={!!videoTarget} onOpenChange={(open) => { if (!open) closeVideoDialog(); }}>
        <DialogContent className="bg-brand-surface border-brand-border text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Video className="size-5 text-brand-orange" />
              Vidéo — {videoTarget?.nom_fr}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Vidéo existante */}
            {videoTarget?.video_url && (
              <div className="space-y-2">
                <p className="text-brand-muted text-xs uppercase tracking-wider font-medium">Vidéo actuelle</p>
                <video
                  src={videoTarget.video_url}
                  controls
                  className="w-full rounded-lg border border-brand-border bg-black"
                  style={{ maxHeight: 180 }}
                />
              </div>
            )}

            {/* Sélecteur de mode */}
            <div className="flex rounded-lg border border-brand-border overflow-hidden">
              <button
                type="button"
                onClick={() => { setVideoMode("file"); setVideoUrl(""); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                  videoMode === "file"
                    ? "bg-brand-orange text-white"
                    : "bg-brand-black text-brand-muted hover:text-white"
                )}
              >
                <UploadCloud className="size-4" />Uploader un fichier
              </button>
              <button
                type="button"
                onClick={() => { setVideoMode("url"); setVideoFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                  videoMode === "url"
                    ? "bg-brand-orange text-white"
                    : "bg-brand-black text-brand-muted hover:text-white"
                )}
              >
                <Link2 className="size-4" />Lien vidéo
              </button>
            </div>

            {/* ── Mode fichier ── */}
            {videoMode === "file" && (
              <>
                <div
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                    videoFile
                      ? "border-brand-green/50 bg-brand-green/5"
                      : "border-brand-border hover:border-brand-orange/50 cursor-pointer",
                    uploading && "pointer-events-none opacity-60"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_VIDEO}
                    onChange={onFileChange}
                    className="hidden"
                  />
                  {videoFile ? (
                    <div className="space-y-1">
                      <Video className="size-8 text-brand-green-light mx-auto" />
                      <p className="text-white text-sm font-medium">{videoFile.name}</p>
                      <p className="text-brand-muted text-xs">{(videoFile.size / 1024 / 1024).toFixed(1)} Mo</p>
                      {!uploading && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setVideoFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                          className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mt-1"
                        >
                          <X className="size-3" />Changer
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <UploadCloud className="size-8 text-brand-muted mx-auto" />
                      <p className="text-white text-sm">Cliquez pour choisir un fichier</p>
                      <p className="text-brand-muted text-xs">MP4 ou WebM — max {MAX_SIZE_MB} Mo</p>
                    </div>
                  )}
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-brand-muted">Upload en cours…</span>
                      <span className="text-white font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-brand-black rounded-full h-2">
                      <div
                        className="bg-brand-orange h-2 rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Mode URL ── */}
            {videoMode === "url" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-white text-sm">URL de la vidéo</Label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted" />
                    <Input
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=… ou https://…/video.mp4"
                      className="pl-9 bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
                    />
                  </div>
                  <p className="text-brand-muted text-xs">
                    YouTube, Vimeo, ou lien direct vers un fichier MP4/WebM
                  </p>
                </div>

                {/* Aperçu si c'est un lien direct vidéo */}
                {videoUrl && (videoUrl.endsWith(".mp4") || videoUrl.endsWith(".webm")) && (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full rounded-lg border border-brand-border bg-black"
                    style={{ maxHeight: 160 }}
                  />
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={closeVideoDialog}
                disabled={uploading || saveUrlMutation.isPending}
                className="flex-1 border-brand-border text-brand-muted hover:text-white"
              >
                Annuler
              </Button>

              {videoMode === "file" ? (
                <Button
                  onClick={uploadVideo}
                  disabled={!videoFile || uploading}
                  className="flex-1 bg-brand-orange hover:bg-brand-orange-light text-white"
                >
                  {uploading
                    ? <><Loader2 className="size-4 animate-spin mr-2" />{uploadProgress}%</>
                    : <><UploadCloud className="size-4 mr-2" />Uploader</>
                  }
                </Button>
              ) : (
                <Button
                  onClick={() => saveUrlMutation.mutate({ id: videoTarget!.id, url: videoUrl })}
                  disabled={!videoUrl.trim() || saveUrlMutation.isPending}
                  className="flex-1 bg-brand-orange hover:bg-brand-orange-light text-white"
                >
                  {saveUrlMutation.isPending
                    ? <Loader2 className="size-4 animate-spin" />
                    : <><Link2 className="size-4 mr-2" />Enregistrer</>
                  }
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Supprimer ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Supprimer la technique"
        description={`Supprimer "${deleteTarget?.nom_fr}" ? Cette action est irréversible.`}
        variant="destructive"
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget!.id)}
      />
    </div>
  );
}
