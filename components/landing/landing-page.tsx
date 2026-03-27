'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

import { ArrowRight, CheckCircle2, Globe, Shield, Zap } from 'lucide-react';
import Image from 'next/image';

export function LandingHero() {
  return (
    <section className="relative pt-20 pb-24 overflow-hidden bg-background">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none" />
      
      <div className="container relative px-4 mx-auto">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">

          
          <h1 className="text-5xl md:text-7xl font-heading font-bold tracking-tight mb-8 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent leading-[1.1]">
            Klaxtrix: The Future of School Mgmt.
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
            A modern, high-fidelity platform for managing operations, academics, and communication with unparalleled ease. Built for visionary institutions.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Button size="lg" className="rounded-full h-12 px-8 text-base font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform" asChild>
              <Link href="/register">
                Register your School <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full h-12 px-8 text-base font-semibold hover:bg-muted/50 transition-colors">
              Request a Demo
            </Button>
          </div>
          
          {/* Dashboard Preview / Mockup */}
          <div className="relative w-full aspect-video rounded-3xl border border-border/50 bg-muted/20 shadow-2xl overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-secondary/5" />
             <div className="absolute top-0 left-0 w-full p-4 border-b border-border/10 bg-background/50 backdrop-blur-md flex items-center justify-between">
                <div className="flex gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-400" />
                   <div className="w-3 h-3 rounded-full bg-yellow-400" />
                   <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                   <Globe className="w-3 h-3" />
                   monidams.klaxtrix.com.ng
                </div>
                <div className="w-8 h-4" />
             </div>
             
             {/* Replace with actual dashboard screenshot or premium graphic */}
             <div className="flex items-center justify-center h-full pt-12">
                 <div className="text-center">
                    <Zap className="w-16 h-16 text-primary/40 mx-auto mb-4 animate-pulse" />
                    <p className="text-sm font-medium text-muted-foreground">High-Fidelity Dashboard Experience</p>
                 </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFeatures() {
  const features = [
    {
      title: "Partner-Cloud Model",
      description: "Infinite scalability. Each school owns their respective cloud accounts, ensuring data sovereignty and zero resource competition.",
      icon: Globe,
      color: "text-blue-500",
    },
    {
      title: "Executive Guard",
      description: "Centralized monitoring for the mother institution. Oversee performance, attendance, and health across all tenant schools.",
      icon: Shield,
      color: "text-purple-500",
    },
    {
      title: "Bento Branded Portals",
      description: "Stunning, high-fidelity interfaces for students, parents, and teachers. Perfectly optimized for clarity and engagement.",
      icon: Zap,
      color: "text-yellow-500",
    }
  ];

  return (
    <section className="py-24 bg-muted/30">
       <div className="container px-4 mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
             {features.map((feature, i) => (
                <div key={i} className="p-8 rounded-3xl bg-background border border-border/50 hover:border-primary/20 transition-all hover:shadow-xl hover:shadow-primary/5 group">
                   <div className={`w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                   </div>
                   <h3 className="text-xl font-heading font-bold mb-3">{feature.title}</h3>
                   <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
             ))}
          </div>
       </div>
    </section>
  );
}
