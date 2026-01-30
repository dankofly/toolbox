import Link from 'next/link';
import {
  Ruler,
  TreePine,
  Cone,
  LayoutGrid,
  Scissors,
  Map,
  Scan,
  Lock,
  Crown,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

  const accessBadge = {
    free: { label: 'Kostenlos', variant: 'default' as const, icon: null },
    registered: { label: 'Account erforderlich', variant: 'secondary' as const, icon: Lock },
    premium: { label: 'Premium', variant: 'destructive' as const, icon: Crown },
  }[tool.accessLevel];

  const AccessIcon = accessBadge.icon;

  return (
    <Link href={`/tools/${tool.slug}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Icon className="h-6 w-6" />
            </div>
            <Badge variant={accessBadge.variant} className="flex items-center gap-1">
              {AccessIcon && <AccessIcon className="h-3 w-3" />}
              {accessBadge.label}
            </Badge>
          </div>
          <CardTitle className="mt-4">{tool.name}</CardTitle>
          <CardDescription>{tool.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">{tool.category}</Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
