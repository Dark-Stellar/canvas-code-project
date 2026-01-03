import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="pt-3 pb-2 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-4.5 w-4.5 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-1">
          {actions}
        </div>
      )}
    </div>
  );
}
