import Link from 'next/link';
import { Wrench } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/50">
      <div className="container px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <span className="font-bold">Kofler ToolBox</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Professionelle Rechner und Tools für Holz- und Baugewerbe.
            </p>
          </div>

          {/* Tools */}
          <div>
            <h3 className="font-semibold mb-4">Tools</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/tools/sparrenlaengen-rechner" className="hover:text-primary">
                  Sparrenlängen-Rechner
                </Link>
              </li>
              <li>
                <Link href="/tools/holz-tools" className="hover:text-primary">
                  Holz-Tools
                </Link>
              </li>
              <li>
                <Link href="/tools/kegelstumpf" className="hover:text-primary">
                  Kegelstumpf Abwicklung
                </Link>
              </li>
              <li>
                <Link href="/tools" className="hover:text-primary">
                  Alle Tools →
                </Link>
              </li>
            </ul>
          </div>

          {/* Kategorien */}
          <div>
            <h3 className="font-semibold mb-4">Kategorien</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/tools?category=Dach" className="hover:text-primary">
                  Dach
                </Link>
              </li>
              <li>
                <Link href="/tools?category=Holz" className="hover:text-primary">
                  Holz
                </Link>
              </li>
              <li>
                <Link href="/tools?category=Geometrie" className="hover:text-primary">
                  Geometrie
                </Link>
              </li>
              <li>
                <Link href="/tools?category=Vermessung" className="hover:text-primary">
                  Vermessung
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Rechtliches</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/impressum" className="hover:text-primary">
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="hover:text-primary">
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link href="/agb" className="hover:text-primary">
                  AGB
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} Kofler e.U. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </footer>
  );
}
