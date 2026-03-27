'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LandingHeader } from '@/components/landing/landing-header';
import { ArrowLeft, Construction, Mail, Sparkles } from 'lucide-react';

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingHeader />
      
      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-4 pt-20">
        {/* Animated Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-700" />
        
        <div className="relative max-w-2xl w-full text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Under Construction</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-heading font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
            Resources are <br /> Coming Soon.
          </h1>
          
          <p className="text-xl text-muted-foreground leading-relaxed">
            We're building a comprehensive library of institutional guides, case studies, and documentation to help our visionary schools excel.
          </p>
          
          <div className="p-1 px-1 flex flex-col sm:flex-row items-center gap-3 bg-muted/30 rounded-3xl border border-border/50 max-w-md mx-auto">
            <div className="flex-1 flex items-center gap-3 px-4 py-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <input 
                type="email" 
                placeholder="institution@email.com"
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/50"
              />
            </div>
            <Button className="rounded-2xl px-8 py-6 shadow-lg shadow-primary/20">
              Notify Me
            </Button>
          </div>
          
          <div className="pt-8">
            <Button variant="ghost" className="rounded-full gap-2 text-muted-foreground hover:text-foreground" asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </main>
      
      <footer className="py-12 border-t border-border/50 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Klaxtrix. All rights reserved.</p>
      </footer>
    </div>
  );
}
