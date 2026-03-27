import { LandingHeader } from '@/components/landing/landing-header';
import { LandingHero, LandingFeatures, LandingSolutions, LandingContact } from '@/components/landing/landing-page';
import { Button } from '@/components/ui/button';
import { ArrowRight, Globe, School } from 'lucide-react';
import Link from 'next/link';

export default function RootPage() {
  return (
    <main className="min-h-screen selection:bg-primary/30 selection:text-primary">
      <LandingHeader />
      
      <LandingHero />
      
      <LandingFeatures />
      
      <LandingSolutions />

      {/* Trust Section / Stats / Bento */}
      <section className="py-24 container px-4 mx-auto">
         <div className="grid md:grid-cols-2 gap-8">
            <div className="p-10 rounded-3xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/10 flex flex-col justify-between">
               <div>
                  <h2 className="text-3xl font-heading font-bold mb-4">Ready to Transform?</h2>
                  <p className="text-muted-foreground mb-8 text-lg">
                    Join hundreds of institutions using Klaxtrix to pioneer the future of academics.
                  </p>
               </div>
               <div className="flex items-center gap-4">
                  <Button size="lg" className="rounded-full h-12 px-8 bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 transition-transform" asChild>
                     <Link href="/register">Register Today</Link>
                  </Button>
               </div>
            </div>
            
            <div className="p-10 rounded-3xl bg-muted/40 border border-border/50 flex flex-col justify-center items-center text-center">
               <Globe className="w-12 h-12 text-primary/40 mb-6 animate-pulse" />
               <h3 className="text-xl font-heading font-bold mb-2">Global Infrastructure</h3>
               <p className="text-muted-foreground">
                 Deploying in 15+ regions with zero-latency data access for every student.
               </p>
            </div>
         </div>
      </section>

      <LandingContact />
      
      {/* Footer */}
      <footer className="py-12 border-t border-border/50 bg-background/50 backdrop-blur-sm">
         <div className="container px-4 mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
               <School className="w-5 h-5 text-primary" />
               <span className="font-heading font-bold text-lg">Klaxtrix</span>
            </div>
            <p className="text-sm text-muted-foreground">
               © 2026 Klaxtrix Institution Management. All rights reserved.
            </p>
            <div className="flex gap-6">
               <Link href="#" className="text-sm text-primary hover:underline">Privacy Policy</Link>
               <Link href="#" className="text-sm text-primary hover:underline">Terms of Service</Link>
            </div>
         </div>
      </footer>
    </main>
  );
}
