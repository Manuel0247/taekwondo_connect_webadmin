import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  trend?: string;
  trendUp?: boolean;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-brand-orange",
  trend,
  trendUp,
}: StatsCardProps) {
  return (
    <div className="bg-brand-surface rounded-xl border border-brand-border p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-brand-muted text-sm font-medium">{title}</p>
        <div className={cn("p-2 rounded-lg bg-white/5", iconColor)}>
          <Icon className="size-4" />
        </div>
      </div>
      <p className="text-white text-2xl font-bold">{value}</p>
      {trend && (
        <p
          className={cn(
            "text-xs mt-1",
            trendUp ? "text-brand-green-light" : "text-red-400"
          )}
        >
          {trend}
        </p>
      )}
    </div>
  );
}
