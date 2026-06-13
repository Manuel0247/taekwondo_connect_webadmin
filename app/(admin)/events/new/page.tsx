"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TopBar } from "@/components/admin/TopBar";
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
import type { Resolver } from "react-hook-form";
import api from "@/lib/api";

const schema = z.object({
  titre: z.string().min(1, "Titre requis"),
  type: z.enum(["competition", "passage_grade", "stage", "cours_special"]),
  adresse: z.string().min(1, "Adresse requise"),
  date_debut: z.string().min(1, "Date de début requise"),
  date_fin: z.string().min(1, "Date de fin requise"),
  places_total: z.number().int().min(1, "Minimum 1 place"),
  date_limite_inscription: z.string().optional(),
  statut: z.enum(["brouillon", "publie"]),
});

type FormData = z.infer<typeof schema>;

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as unknown as Resolver<FormData>,
    defaultValues: { type: "competition" as const, statut: "brouillon" as const },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        date_debut: data.date_debut.replace("T", " ") + ":00",
        date_fin: data.date_fin.replace("T", " ") + ":00",
        date_limite_inscription: data.date_limite_inscription
          ? data.date_limite_inscription.replace("T", " ") + ":00"
          : undefined,
      };
      await api.post("/events", payload);
      toast.success("Événement créé avec succès");
      router.push("/events");
    } catch {
      toast.error("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Nouvel Événement" />
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-brand-muted hover:text-white text-sm mb-6"
        >
          <ArrowLeft className="size-4" />
          Retour
        </Link>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-brand-surface rounded-xl border border-brand-border p-6 space-y-5"
        >
          <h2 className="text-white font-semibold text-lg mb-1">
            Créer un événement
          </h2>

          <div className="space-y-2">
            <Label className="text-white">Titre</Label>
            <Input
              placeholder="Championnat régional…"
              className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
              {...register("titre")}
            />
            {errors.titre && (
              <p className="text-red-400 text-xs">{errors.titre.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Type</Label>
              <Select
                defaultValue="competition"
                onValueChange={(v) =>
                  setValue("type", v as FormData["type"])
                }
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
            </div>
            <div className="space-y-2">
              <Label className="text-white">Statut</Label>
              <Select
                defaultValue="brouillon"
                onValueChange={(v) =>
                  setValue("statut", v as FormData["statut"])
                }
              >
                <SelectTrigger className="bg-brand-black border-brand-border text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-brand-surface border-brand-border text-white">
                  <SelectItem value="brouillon">Brouillon</SelectItem>
                  <SelectItem value="publie">Publier immédiatement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Adresse</Label>
            <Input
              placeholder="Salle omnisports de Cocody…"
              className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
              {...register("adresse")}
            />
            {errors.adresse && (
              <p className="text-red-400 text-xs">{errors.adresse.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-white">Nombre de places</Label>
            <Input
              type="number"
              placeholder="60"
              className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
              {...register("places_total", { valueAsNumber: true })}
            />
            {errors.places_total && (
              <p className="text-red-400 text-xs">
                {errors.places_total.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Date de début</Label>
              <Input
                type="datetime-local"
                className="bg-brand-black border-brand-border text-white"
                {...register("date_debut")}
              />
              {errors.date_debut && (
                <p className="text-red-400 text-xs">
                  {errors.date_debut.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-white">Date de fin</Label>
              <Input
                type="datetime-local"
                className="bg-brand-black border-brand-border text-white"
                {...register("date_fin")}
              />
              {errors.date_fin && (
                <p className="text-red-400 text-xs">
                  {errors.date_fin.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">
              Date limite d&apos;inscription
            </Label>
            <Input
              type="datetime-local"
              className="bg-brand-black border-brand-border text-white"
              {...register("date_limite_inscription")}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-orange hover:bg-brand-orange-light text-white font-semibold h-11"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Créer l'événement"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
