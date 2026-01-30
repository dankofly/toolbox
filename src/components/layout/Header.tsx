'use client';

import Link from 'next/link';
import { Wrench, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Wrench className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">Kofler ToolBox</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/tools"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Alle Tools
          </Link>
          <Link
            href="/tools?filter=free"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Kostenlos
          </Link>
          <Link
            href="/tools?filter=premium"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Premium
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/login">Anmelden</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Registrieren</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container flex flex-col gap-4 p-4">
            <Link
              href="/tools"
              className="text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Alle Tools
            </Link>
            <Link
              href="/tools?filter=free"
              className="text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Kostenlos
            </Link>
            <Link
              href="/tools?filter=premium"
              className="text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Premium
            </Link>
            <hr />
            <Link
              href="/login"
              className="text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium text-primary"
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
