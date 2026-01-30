import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, Crown } from 'lucide-react';
import { getToolBySlug, TOOLS } from '@/lib/tools-config';
import { ToolIframe } from '@/components/tools/ToolIframe';
import { SparrenlaengenRechner } from '@/components/tools/SparrenlaengenRechner';
import { HolzTools } from '@/components/tools/HolzTools';
import { Kegelstumpf } from '@/components/tools/Kegelstumpf';
import { HolzSchindel } from '@/components/tools/HolzSchindel';
import { Verschnittoptimierung } from '@/components/tools/Verschnittoptimierung';
import { RestauroMap } from '@/components/tools/RestauroMap';
import { LaserEntfernungsmesser } from '@/components/tools/LaserEntfernungsmesser';

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

  const accessInfo = {
    free: { label: 'Kostenlos', icon: null },
    registered: { label: 'Account erforderlich', icon: Lock },
    premium: { label: 'Premium', icon: Crown },
  }[tool.accessLevel];

  const AccessIcon = accessInfo.icon;
  // TODO: Re-enable auth check when authentication is implemented
  // const requiresAuth = tool.accessLevel !== 'free';
  const requiresAuth = false; // Temporarily disabled for testing

  return (
    <div className="flex flex-col pt-20">
      {/* Tool Header */}
      <div className="border-b border-border bg-muted/30 px-6 py-8">
        <div className="container max-w-6xl mx-auto">
          <Link
            href="/tools"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zu allen Tools
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm tracking-[0.2em] uppercase text-primary mb-2">
                {tool.category}
              </p>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {tool.name.toUpperCase()}
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl">{tool.description}</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary">
              {AccessIcon && <AccessIcon className="h-4 w-4" />}
              <span className="text-sm font-medium tracking-wide uppercase">
                {accessInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tool Content */}
      <section className="py-8 px-6">
        <div className="container max-w-6xl mx-auto">
          {requiresAuth ? (
            // Show auth required message for non-free tools (MVP - no auth yet)
            <div className="max-w-2xl mx-auto py-16 text-center">
              <div className="w-20 h-20 mx-auto flex items-center justify-center border border-border mb-8">
                {tool.accessLevel === 'premium' ? (
                  <Crown className="h-10 w-10 text-primary" />
                ) : (
                  <Lock className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
                {tool.accessLevel === 'premium'
                  ? 'PREMIUM-TOOL'
                  : 'REGISTRIERUNG ERFORDERLICH'}
              </h2>
              <p className="text-muted-foreground mb-10 max-w-md mx-auto">
                {tool.accessLevel === 'premium'
                  ? 'Dieses Tool ist Teil unseres Premium-Angebots. Registrieren Sie sich, um Zugang zu erhalten.'
                  : 'Um dieses Tool zu nutzen, müssen Sie sich kostenlos registrieren.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/register"
                  className="px-8 py-4 text-sm font-medium tracking-wide uppercase bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Kostenlos registrieren
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-4 text-sm font-medium tracking-wide uppercase border border-border hover:bg-muted transition-colors"
                >
                  Anmelden
                </Link>
              </div>
            </div>
          ) : tool.useNativeComponent ? (
            // Render native React component
            <>
              {tool.slug === 'sparrenlaengen-rechner' && <SparrenlaengenRechner />}
              {tool.slug === 'holz-tools' && <HolzTools />}
              {tool.slug === 'kegelstumpf' && <Kegelstumpf />}
              {tool.slug === 'holz-schindel' && <HolzSchindel />}
              {tool.slug === 'verschnittoptimierung' && <Verschnittoptimierung />}
              {tool.slug === 'restauromap' && <RestauroMap />}
              {tool.slug === 'laser-entfernungsmesser' && <LaserEntfernungsmesser />}
            </>
          ) : (
            // Show tool iframe for other tools
            <ToolIframe htmlFile={tool.htmlFile} title={tool.name} />
          )}
        </div>
      </section>
    </div>
  );
}
