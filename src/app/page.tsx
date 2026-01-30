import Link from 'next/link';
import { ArrowRight, Wrench, Calculator, Ruler, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToolCard } from '@/components/tools/ToolCard';
import { TOOLS, getFreeTools } from '@/lib/tools-config';

export default function Home() {
  const freeTools = getFreeTools();
  const featuredTools = TOOLS.slice(0, 3);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Professionelle Tools
            <br />
            <span className="text-primary">für Holz- und Baugewerbe</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Sparrenlängen, Festmeter, Kegelstümpfe und mehr - präzise berechnen mit unseren Online-Tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/tools">
                Alle Tools entdecken
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/tools/sparrenlaengen-rechner">
                Kostenlos starten
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Präzise Berechnungen</h3>
              <p className="text-sm text-muted-foreground">
                Nach DIN-Normen und Industriestandards
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">7 Spezialtools</h3>
              <p className="text-sm text-muted-foreground">
                Für verschiedene Gewerke und Anwendungen
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Ruler className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Export-Funktionen</h3>
              <p className="text-sm text-muted-foreground">
                PDF, Excel und DXF für CNC
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Kostenlose Basis</h3>
              <p className="text-sm text-muted-foreground">
                Grundfunktionen ohne Anmeldung nutzbar
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tools */}
      <section className="py-16 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Beliebte Tools</h2>
              <p className="text-muted-foreground mt-2">
                Unsere meistgenutzten Rechner und Werkzeuge
              </p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/tools">
                Alle anzeigen
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {featuredTools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {/* Free Tools Section */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">Kostenlose Tools</h2>
            <p className="text-muted-foreground mt-2">
              Sofort nutzbar - ohne Registrierung
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {freeTools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Bereit für professionelle Berechnungen?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Registrieren Sie sich kostenlos und erhalten Sie Zugang zu allen Tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/register">
                Kostenlos registrieren
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/tools">
                Tools ansehen
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
