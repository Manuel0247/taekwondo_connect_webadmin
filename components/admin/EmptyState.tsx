import { LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  message?: string;
  icon?: LucideIcon;
}

export function EmptyState({
  message = "Aucun résultat",
  icon: Icon = Inbox,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-brand-muted">
      <Icon className="size-10 mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
