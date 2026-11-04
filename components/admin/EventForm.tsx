"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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

const schema = z.object({
  titre: z.string().min(1, "Titre requis"),
  description: z.string().optional(),
  type: z.enum(["competition", "passage_grade", "stage", "cours_special"]),
  adresse: z.string().min(1, "Adresse requise"),
  date_debut: z.string().min(1, "Date de début requise"),
  date_fin: z.string().min(1, "Date de fin requise"),
  places_total: z.number().int().min(1, "Minimum 1 place"),
  date_limite_inscription: z.string().optional(),
  statut: z.enum(["brouillon", "publie"]),
}).refine((d) => !d.date_debut || !d.date_fin || d.date_fin >= d.date_debut, {
  message: "La fin doit être après le début",
  path: ["date_fin"],
});

export type EventFormData = z.infer<typeof schema>;

/** Date ISO de l'API → valeur d'un <input type="datetime-local"> (heure telle que saisie). */
export function toDatetimeLocal(iso?: string | null): string {
  return iso ? iso.replace(" ", "T").slice(0, 16) : "";
}

/** Valeurs du formulaire → payload attendu par l'API ("YYYY-MM-DD HH:mm:ss"). */
export function toEventPayload(data: EventFormData) {
  const toApi = (v: string) => v.replace("T", " ") + ":00";
  return {
    ...data,
    description: data.description?.trim() || null,
    date_debut: toApi(data.date_debut),
    date_fin: toApi(data.date_fin),
    date_limite_inscription: data.date_limite_inscription ? toApi(data.date_limite_inscription) : null,
  };
}

export function EventForm({
  mode,
  defaultValues,
  submitting,
  typeLocked = false,
  onSubmit,
}: {
  mode: "create" | "edit";
  defaultValues?: Partial<EventFormData>;
  submitting: boolean;
  /** Type figé (compétition terminée : ses points en dépendent) */
  typeLocked?: boolean;
  onSubmit: (data: EventFormData) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(schema) as unknown as Resolver<EventFormData>,
    defaultValues: { type: "competition", statut: "brouillon", ...defaultValues },
  });

  const type = watch("type");
  const statut = watch("statut");

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-brand-surface rounded-xl border border-brand-border p-6 space-y-5"
    >
      <h2 className="text-white font-semibold text-lg mb-1">
        {mode === "create" ? "Créer un événement" : "Modifier l'événement"}
      </h2>

      <div className="space-y-2">
        <Label className="text-white">Titre</Label>
        <Input
          placeholder="Championnat régional…"
          className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
          {...register("titre")}
        />
        {errors.titre && <p className="text-red-400 text-xs">{errors.titre.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-white">Description</Label>
        <textarea
          rows={3}
          placeholder="Programme, catégories, informations pratiques…"
          className="w-full rounded-md border border-brand-border bg-brand-black px-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
          {...register("description")}
        />
      </div>

      <div className={mode === "create" ? "grid grid-cols-2 gap-4" : "space-y-2"}>
        <div className="space-y-2">
          <Label className="text-white">Type</Label>
          <Select
            value={type}
            onValueChange={(v) => setValue("type", v as EventFormData["type"])}
            disabled={typeLocked}
          >
            <SelectTrigger className="bg-brand-black border-brand-border text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-brand-surface border-brand-border text-white">
              <SelectItem value="competition">Compétition</SelectItem>
              <SelectItem value="passage_grade">Passage de grade</SelectItem>
              <SelectItem value="stage">Stage</SelectItem>
              <SelectItem value="cours_special">Cours spécial</SelectItem>
            </SelectContent>
          </Select>
          {typeLocked && (
            <p className="text-brand-muted text-xs">Compétition terminée : le type ne peut plus changer.</p>
          )}
        </div>
        {/* La publication d'un événement existant se fait depuis la liste */}
        {mode === "create" && (
          <div className="space-y-2">
            <Label className="text-white">Statut</Label>
            <Select value={statut} onValueChange={(v) => setValue("statut", v as EventFormData["statut"])}>
              <SelectTrigger className="bg-brand-black border-brand-border text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-brand-surface border-brand-border text-white">
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="publie">Publier immédiatement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-white">Adresse</Label>
        <Input
          placeholder="Salle omnisports de Cocody…"
          className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
          {...register("adresse")}
        />
        {errors.adresse && <p className="text-red-400 text-xs">{errors.adresse.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-white">Nombre de places</Label>
        <Input
          type="number"
          placeholder="60"
          className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
          {...register("places_total", { valueAsNumber: true })}
        />
        {errors.places_total && <p className="text-red-400 text-xs">{errors.places_total.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white">Date de début</Label>
          <Input type="datetime-local" className="bg-brand-black border-brand-border text-white" {...register("date_debut")} />
          {errors.date_debut && <p className="text-red-400 text-xs">{errors.date_debut.message}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-white">Date de fin</Label>
          <Input type="datetime-local" className="bg-brand-black border-brand-border text-white" {...register("date_fin")} />
          {errors.date_fin && <p className="text-red-400 text-xs">{errors.date_fin.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-white">Date limite d&apos;inscription</Label>
        <Input
          type="datetime-local"
          className="bg-brand-black border-brand-border text-white"
          {...register("date_limite_inscription")}
        />
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-brand-orange hover:bg-brand-orange-light text-white font-semibold h-11"
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : mode === "create" ? (
          "Créer l'événement"
        ) : (
          "Enregistrer les modifications"
        )}
      </Button>
    </form>
  );
}
