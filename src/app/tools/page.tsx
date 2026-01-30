import { ToolCard } from '@/components/tools/ToolCard';
import { TOOLS, CATEGORIES } from '@/lib/tools-config';
import { Badge } from '@/components/ui/badge';

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
    <div className="container max-w-6xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Alle Tools</h1>
        <p className="text-muted-foreground">
          Wählen Sie ein Tool aus, um mit der Berechnung zu beginnen.
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <a href="/tools">
          <Badge
            variant={!filter && !category ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-primary/80"
          >
            Alle
          </Badge>
        </a>
        <a href="/tools?filter=free">
          <Badge
            variant={filter === 'free' ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-primary/80"
          >
            Kostenlos
          </Badge>
        </a>
        <a href="/tools?filter=premium">
          <Badge
            variant={filter === 'premium' ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-primary/80"
          >
            Premium
          </Badge>
        </a>
        <span className="mx-2 text-muted-foreground">|</span>
        {CATEGORIES.map((cat) => (
          <a key={cat} href={`/tools?category=${encodeURIComponent(cat)}`}>
            <Badge
              variant={category === cat ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-primary/80"
            >
              {cat}
            </Badge>
          </a>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Keine Tools gefunden.
        </div>
      )}
    </div>
  );
}
