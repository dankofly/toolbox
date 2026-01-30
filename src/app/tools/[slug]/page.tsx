import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, Crown } from 'lucide-react';
import { getToolBySlug, TOOLS } from '@/lib/tools-config';
import { ToolIframe } from '@/components/tools/ToolIframe';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return TOOLS.map((tool) => ({
    slug: tool.slug,
  }));
}

export async function generateMetadata({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    return { title: 'Tool nicht gefunden' };
  }

  return {
    title: `${tool.name} - Kofler ToolBox`,
    description: tool.description,
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  const accessBadge = {
    free: { label: 'Kostenlos', variant: 'default' as const, icon: null },
    registered: { label: 'Account erforderlich', variant: 'secondary' as const, icon: Lock },
    premium: { label: 'Premium', variant: 'destructive' as const, icon: Crown },
  }[tool.accessLevel];

  const AccessIcon = accessBadge.icon;
  const requiresAuth = tool.accessLevel !== 'free';

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="border-b bg-muted/50 px-4 py-4">
        <div className="container max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tools">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück
              </Link>
            </Button>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{tool.name}</h1>
              <p className="text-muted-foreground mt-1">{tool.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{tool.category}</Badge>
              <Badge variant={accessBadge.variant} className="flex items-center gap-1">
                {AccessIcon && <AccessIcon className="h-3 w-3" />}
                {accessBadge.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Tool Content */}
      <div className="flex-1">
        {requiresAuth ? (
          // Show auth required message for non-free tools (MVP - no auth yet)
          <div className="container max-w-2xl mx-auto py-20 px-4 text-center">
            <div className="p-4 rounded-full bg-muted w-fit mx-auto mb-6">
              {tool.accessLevel === 'premium' ? (
                <Crown className="h-12 w-12 text-yellow-500" />
              ) : (
                <Lock className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <h2 className="text-2xl font-bold mb-4">
              {tool.accessLevel === 'premium'
                ? 'Premium-Tool'
                : 'Registrierung erforderlich'}
            </h2>
            <p className="text-muted-foreground mb-8">
              {tool.accessLevel === 'premium'
                ? 'Dieses Tool ist Teil unseres Premium-Angebots. Registrieren Sie sich, um Zugang zu erhalten.'
                : 'Um dieses Tool zu nutzen, müssen Sie sich kostenlos registrieren.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">Kostenlos registrieren</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Anmelden</Link>
              </Button>
            </div>
          </div>
        ) : (
          // Show tool iframe for free tools
          <ToolIframe htmlFile={tool.htmlFile} title={tool.name} />
        )}
      </div>
    </div>
  );
}
