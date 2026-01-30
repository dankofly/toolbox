import Link from 'next/link';
import { ArrowRight, Calculator, Ruler, FileSpreadsheet, Shield } from 'lucide-react';
import { ToolCard } from '@/components/tools/ToolCard';
import { TOOLS, getFreeTools } from '@/lib/tools-config';

export default function Home() {
  const freeTools = getFreeTools();
  const featuredTools = TOOLS.slice(0, 3);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background with gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted" />
        <div className="absolute inset-0 hero-gradient" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground) / 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--foreground) / 0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        <div className="relative container max-w-5xl mx-auto px-6 text-center pt-20">
          <p className="text-sm tracking-[0.3em] uppercase text-primary mb-6">
            Kofler e.U. Spezialwerkzeuge
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[0.9]">
            PROFESSIONELLE
            <br />
            <span className="text-muted-foreground">RECHNER</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            Spezialisierte Online-Tools für das Holz- und Baugewerbe.
            Sparrenlängen, Festmeter, Kegelstümpfe und mehr.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/tools"
              className="group inline-flex items-center justify-center px-8 py-4 text-sm font-medium tracking-wide uppercase bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              Alle Tools entdecken
              <ArrowRight className="ml-3 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/tools/sparrenlaengen-rechner"
              className="inline-flex items-center justify-center px-8 py-4 text-sm font-medium tracking-wide uppercase border border-border hover:bg-muted transition-all"
            >
              Kostenlos starten
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground">
          <span className="text-xs tracking-widest uppercase">Scrollen</span>
          <div className="w-px h-12 bg-gradient-to-b from-primary/50 to-transparent" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-6 border-t border-border">
        <div className="container max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="text-center group">
              <div className="mx-auto w-16 h-16 flex items-center justify-center mb-6 border border-border group-hover:border-primary group-hover:text-primary transition-colors">
                <Calculator className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-medium tracking-wide uppercase mb-3">Präzise Berechnungen</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nach DIN-Normen und Industriestandards
              </p>
            </div>
            <div className="text-center group">
              <div className="mx-auto w-16 h-16 flex items-center justify-center mb-6 border border-border group-hover:border-primary group-hover:text-primary transition-colors">
                <Ruler className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-medium tracking-wide uppercase mb-3">7 Spezialtools</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Für verschiedene Gewerke und Anwendungen
              </p>
            </div>
            <div className="text-center group">
              <div className="mx-auto w-16 h-16 flex items-center justify-center mb-6 border border-border group-hover:border-primary group-hover:text-primary transition-colors">
                <FileSpreadsheet className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-medium tracking-wide uppercase mb-3">Export-Funktionen</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                PDF, Excel und DXF für CNC-Maschinen
              </p>
            </div>
            <div className="text-center group">
              <div className="mx-auto w-16 h-16 flex items-center justify-center mb-6 border border-border group-hover:border-primary group-hover:text-primary transition-colors">
                <Shield className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-medium tracking-wide uppercase mb-3">Kostenlose Basis</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Grundfunktionen ohne Anmeldung nutzbar
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tools Section */}
      <section className="py-32 px-6 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <p className="text-sm tracking-[0.2em] uppercase text-primary mb-4">Unsere Werkzeuge</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">BELIEBTE TOOLS</h2>
            </div>
            <Link
              href="/tools"
              className="group inline-flex items-center text-sm font-medium tracking-wide uppercase text-muted-foreground hover:text-primary transition-colors"
            >
              Alle anzeigen
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {featuredTools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {/* Free Tools Section */}
      <section className="py-32 px-6 border-t border-border">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm tracking-[0.2em] uppercase text-primary mb-4">Sofort starten</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">KOSTENLOSE TOOLS</h2>
            <p className="text-muted-foreground mt-4">
              Ohne Registrierung nutzbar
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {freeTools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 bg-muted/30 border-t border-border">
        <div className="container max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            BEREIT FÜR
            <br />
            <span className="text-muted-foreground">PROFESSIONELLE BERECHNUNGEN?</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-xl mx-auto">
            Registrieren Sie sich kostenlos und erhalten Sie Zugang zu allen Tools und Premium-Funktionen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 text-sm font-medium tracking-wide uppercase bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              Kostenlos registrieren
            </Link>
            <Link
              href="/tools"
              className="inline-flex items-center justify-center px-8 py-4 text-sm font-medium tracking-wide uppercase border border-border hover:bg-muted transition-all"
            >
              Tools ansehen
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
