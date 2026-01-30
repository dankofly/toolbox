import Link from 'next/link';
import {
  Ruler,
  TreePine,
  Cone,
  LayoutGrid,
  Scissors,
  Map,
  Scan,
  ArrowRight,
  Lock,
  Crown,
} from 'lucide-react';
import type { Tool } from '@/lib/tools-config';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Ruler,
  TreePine,
  Cone,
  LayoutGrid,
  Scissors,
  Map,
  Scan,
};

interface ToolCardProps {
  tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
  const Icon = iconMap[tool.icon] || Ruler;

  const accessInfo = {
    free: { label: 'Kostenlos', icon: null },
    registered: { label: 'Account', icon: Lock },
    premium: { label: 'Premium', icon: Crown },
  }[tool.accessLevel];

  const AccessIcon = accessInfo.icon;

  return (
    <Link href={`/tools/${tool.slug}`} className="group block">
      <div className="relative h-full p-8 border border-border hover:border-primary/50 bg-card hover-glow transition-all duration-300">
        {/* Access badge */}
        <div className="absolute top-6 right-6 flex items-center gap-1.5 text-xs tracking-wide uppercase text-muted-foreground">
          {AccessIcon && <AccessIcon className="h-3 w-3" />}
          {accessInfo.label}
        </div>

        {/* Icon */}
        <div className="w-14 h-14 flex items-center justify-center border border-border group-hover:border-primary group-hover:text-primary transition-colors mb-6">
          <Icon className="h-6 w-6" />
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium tracking-tight group-hover:text-primary transition-colors">
            {tool.name}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {tool.description}
          </p>
        </div>

        {/* Category & Arrow */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <span className="text-xs tracking-wide uppercase text-muted-foreground">
            {tool.category}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  );
}
