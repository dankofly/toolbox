'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container max-w-7xl mx-auto flex h-20 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl font-bold tracking-tight">KOFLER</span>
          <span className="text-sm text-muted-foreground font-light tracking-widest uppercase">ToolBox</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-10">
          <Link
            href="/tools"
            className="text-sm font-medium tracking-wide uppercase text-muted-foreground hover:text-primary transition-colors"
          >
            Alle Tools
          </Link>
          <Link
            href="/tools?filter=free"
            className="text-sm font-medium tracking-wide uppercase text-muted-foreground hover:text-primary transition-colors"
          >
            Kostenlos
          </Link>
          <Link
            href="/tools?filter=premium"
            className="text-sm font-medium tracking-wide uppercase text-muted-foreground hover:text-primary transition-colors"
          >
            Premium
          </Link>
          <Link
            href="https://turmdecker.com"
            target="_blank"
            className="text-sm font-medium tracking-wide uppercase text-muted-foreground hover:text-primary transition-colors"
          >
            Turmdecker
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            Anmelden
          </Link>
          <Link
            href="/register"
            className="px-6 py-2.5 text-sm font-medium tracking-wide uppercase bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Registrieren
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            className="p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden glass border-t border-border">
          <nav className="container flex flex-col gap-1 p-6">
            <Link
              href="/tools"
              className="py-3 text-sm font-medium tracking-wide uppercase text-muted-foreground hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Alle Tools
            </Link>
            <Link
              href="/tools?filter=free"
              className="py-3 text-sm font-medium tracking-wide uppercase text-muted-foreground hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Kostenlos
            </Link>
            <Link
              href="/tools?filter=premium"
              className="py-3 text-sm font-medium tracking-wide uppercase text-muted-foreground hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Premium
            </Link>
            <div className="h-px bg-border my-3" />
            <Link
              href="/login"
              className="py-3 text-sm font-medium tracking-wide uppercase"
              onClick={() => setMobileMenuOpen(false)}
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className="mt-2 py-3 text-center text-sm font-medium tracking-wide uppercase bg-primary text-primary-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Registrieren
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
