"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { Skeleton } from "@/components/ui/skeleton";
import { EventForm, toDatetimeLocal, toEventPayload, toTarifForm, type EventFormData } from "@/components/admin/EventForm";
import api from "@/lib/api";

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: ev, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => (await api.get(`/events/${id}`)).data.data,
  });

  const updateMutation = useMutation({
    mutationFn: (data: EventFormData) => {
      const payload = toEventPayload(data);
      // Le statut se change par les actions Publier / Annuler, pas par ce formulaire
      const { statut: _statut, ...rest } = payload;
      void _statut;
      return api.put(`/events/${id}`, rest);
    },
    onSuccess: () => {
      toast.success("Événement mis à jour");
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      router.push(`/events/${id}`);
    },
    onError: (err) => {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      toast.error("Modification impossible", { description: message });
    },
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Modifier l'événement" />
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        <Link
          href={`/events/${id}`}
          className="inline-flex items-center gap-1.5 text-brand-muted hover:text-white text-sm mb-6"
        >
          <ArrowLeft className="size-4" />
          Retour à l&apos;événement
        </Link>
        {isLoading ? (
          <Skeleton className="h-[600px] rounded-xl bg-brand-surface" />
        ) : !ev ? (
          <p className="text-brand-muted">Événement introuvable</p>
        ) : (
          <EventForm
            mode="edit"
            submitting={updateMutation.isPending}
            typeLocked={ev.statut === "termine"}
            defaultValues={{
              titre: ev.titre,
              description: ev.description ?? "",
              type: ev.type,
              adresse: ev.adresse ?? "",
              places_total: ev.places_total,
              date_debut: toDatetimeLocal(ev.date_debut),
              date_fin: toDatetimeLocal(ev.date_fin),
              date_limite_inscription: toDatetimeLocal(ev.date_limite_inscription),
              statut: ev.statut === "publie" ? "publie" : "brouillon",
              ...toTarifForm(ev),
            }}
            onSubmit={(data) => updateMutation.mutate(data)}
          />
        )}
      </div>
    </div>
  );
}
