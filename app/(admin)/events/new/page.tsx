"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TopBar } from "@/components/admin/TopBar";
import { EventForm, toEventPayload, type EventFormData } from "@/components/admin/EventForm";
import api from "@/lib/api";

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: EventFormData) => {
    setLoading(true);
    try {
      await api.post("/events", toEventPayload(data));
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
        <EventForm mode="create" submitting={loading} onSubmit={onSubmit} />
      </div>
    </div>
  );
}
