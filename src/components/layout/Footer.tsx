import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10">
      <div className="container max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2 space-y-6">
            <Link href="/" className="inline-block">
              <span className="text-xl font-bold tracking-tight">KOFLER</span>
              <span className="text-sm text-muted-foreground font-light tracking-widest uppercase ml-2">ToolBox</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Professionelle Online-Rechner und Tools für das Holz- und Baugewerbe.
              Ein Service von Kofler e.U.
            </p>
          </div>

          {/* Tools */}
          <div>
            <h3 className="text-sm font-medium tracking-wide uppercase mb-6">Tools</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href="/tools/sparrenlaengen-rechner" className="hover:text-foreground transition-colors">
                  Sparrenlängen-Rechner
                </Link>
              </li>
              <li>
                <Link href="/tools/holz-tools" className="hover:text-foreground transition-colors">
                  Holz-Tools
                </Link>
              </li>
              <li>
                <Link href="/tools/kegelstumpf" className="hover:text-foreground transition-colors">
                  Kegelstumpf Abwicklung
                </Link>
              </li>
              <li>
                <Link href="/tools" className="hover:text-foreground transition-colors">
                  Alle Tools →
                </Link>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-medium tracking-wide uppercase mb-6">Unternehmen</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href="https://turmdecker.com" target="_blank" className="hover:text-foreground transition-colors">
                  Turmdecker
                </Link>
              </li>
              <li>
                <Link href="/impressum" className="hover:text-foreground transition-colors">
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="hover:text-foreground transition-colors">
                  Datenschutz
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground tracking-wide">
            &copy; {currentYear} Kofler e.U. Alle Rechte vorbehalten.
          </p>
          <p className="text-xs text-muted-foreground tracking-wide">
            Made in Austria
          </p>
        </div>
      </div>
    </footer>
  );
}
