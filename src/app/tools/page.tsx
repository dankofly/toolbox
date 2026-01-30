import Link from 'next/link';
import { ToolCard } from '@/components/tools/ToolCard';
import { TOOLS, CATEGORIES } from '@/lib/tools-config';

interface ToolsPageProps {
  searchParams: Promise<{ filter?: string; category?: string }>;
}

export default async function ToolsPage({ searchParams }: ToolsPageProps) {
  const params = await searchParams;
  const filter = params.filter;
  const category = params.category;

  let filteredTools = TOOLS;

  if (filter === 'free') {
    filteredTools = TOOLS.filter((t) => t.accessLevel === 'free');
  } else if (filter === 'premium') {
    filteredTools = TOOLS.filter((t) => t.accessLevel !== 'free');
  }

  if (category) {
    filteredTools = filteredTools.filter((t) => t.category === category);
  }

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="py-20 px-6 border-b border-border">
        <div className="container max-w-6xl mx-auto">
          <p className="text-sm tracking-[0.2em] uppercase text-primary mb-4">
            Werkzeuge
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            ALLE TOOLS
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Wählen Sie ein Tool aus, um mit der Berechnung zu beginnen.
            Professionelle Rechner für das Holz- und Baugewerbe.
          </p>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-8 px-6 border-b border-border bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground mr-2">Filter:</span>
            <Link
              href="/tools"
              className={`px-4 py-2 text-sm font-medium tracking-wide uppercase transition-colors ${
                !filter && !category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Alle
            </Link>
            <Link
              href="/tools?filter=free"
              className={`px-4 py-2 text-sm font-medium tracking-wide uppercase transition-colors ${
                filter === 'free'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Kostenlos
            </Link>
            <Link
              href="/tools?filter=premium"
              className={`px-4 py-2 text-sm font-medium tracking-wide uppercase transition-colors ${
                filter === 'premium'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Premium
            </Link>

            <span className="mx-2 text-border">|</span>

            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/tools?category=${encodeURIComponent(cat)}`}
                className={`px-4 py-2 text-sm font-medium tracking-wide uppercase transition-colors ${
                  category === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-16 px-6">
        <div className="container max-w-6xl mx-auto">
          {filteredTools.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground">Keine Tools gefunden.</p>
              <Link
                href="/tools"
                className="inline-block mt-4 text-sm font-medium text-primary hover:underline"
              >
                Alle Tools anzeigen
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
