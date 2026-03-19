'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, X, Zap } from 'lucide-react';

export function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Solutions', href: '#solutions' },
    { name: 'Resources', href: '#resources' },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent',
        isScrolled ? 'bg-background/80 backdrop-blur-lg border-border/50 py-3 shadow-sm' : 'bg-transparent py-5'
      )}
    >
      <div className="container px-4 mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
             <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <span className="text-2xl font-heading font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Klaxtrix
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" className="text-sm font-semibold rounded-full px-6" asChild>
             <Link href="/login">Login</Link>
          </Button>
          <Button className="text-sm font-semibold rounded-full px-6 bg-primary shadow-lg shadow-primary/20 hover:scale-105 transition-transform" asChild>
             <Link href="/register">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border p-6 animate-in slide-in-from-top-4 duration-300 shadow-xl">
           <nav className="flex flex-col gap-4 mb-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
           </nav>
           <div className="flex flex-col gap-3">
              <Button variant="outline" className="w-full rounded-xl py-6" asChild>
                 <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
              </Button>
              <Button className="w-full rounded-xl py-6 bg-primary shadow-lg shadow-primary/20" asChild>
                 <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>Get Started</Link>
              </Button>
           </div>
        </div>
      )}
    </header>
  );
}
