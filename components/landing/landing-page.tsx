'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

import { ArrowRight, CheckCircle2, Globe, Shield, School, BookOpen, GraduationCap, Laptop, MessageSquare, PhoneCall, MapPin, Baby } from 'lucide-react';
import Image from 'next/image';

export function LandingHero() {
  return (
    <section className="relative pt-20 md:pt-20 pb-24 overflow-hidden bg-background">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none" />
      
      <div className="container relative px-4 mx-auto">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">

          <h1 className="text-3xl sm:text-5xl md:text-7xl font-heading font-bold tracking-tight mb-6 md:mb-8 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent leading-[1.2] md:leading-[1.1] pb-2">
            Klaxtrix: The Future of School Management
          </h1>
          
          <p className="text-base md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
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
          
          {/* ── DESKTOP MOCKUP (md and above) ─────────────────────────────── */}
          <div className="relative w-full aspect-video rounded-3xl border border-border/50 shadow-2xl overflow-hidden bg-slate-100 hidden md:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-blue-400/5" />

            {/* Browser chrome */}
            <div className="absolute top-0 left-0 w-full h-8 border-b border-slate-200 bg-white flex items-center px-3 gap-2 z-10">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <div className="flex-1 flex justify-center">
                <div className="text-[9px] text-slate-400 font-medium flex items-center gap-1 bg-slate-100 rounded-full px-3 py-0.5">
                  <Globe className="w-2 h-2" />
                  school.klaxtrix.com/dashboard/
                </div>
              </div>
            </div>

            {/* Dashboard layout */}
            <div className="absolute inset-0 top-8 flex">
              {/* Sidebar */}
              <div className="w-[18%] bg-white border-r border-slate-100 h-full flex flex-col py-3 shrink-0">
                <div className="flex items-center gap-2 px-3 mb-1">
                  <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                    <School className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <div className="text-[9px] font-extrabold text-slate-900 leading-none">Klaxtrix</div>
                    <div className="text-[6px] text-slate-400 uppercase tracking-widest">Admin Portal</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-col gap-0.5 px-2">
                  <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-blue-600 text-white">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                    <span className="text-[8px] font-semibold">Overview</span>
                  </div>
                  {['Teachers','Classes & Subjects','Academic Timetable','Students','Staff','Attendance Intel','Executive Analytics','Global Communications','MCQ Exams','Academic Results','Fee Management','Settings'].map(item => (
                    <div key={item} className="flex items-center gap-2 px-2 py-0.5 rounded-md text-slate-500">
                      <div className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                      <span className="text-[7px] truncate">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto px-4 pb-2">
                  <div className="text-[7px] text-slate-400">Sign Out</div>
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 bg-slate-50/80 overflow-hidden p-3 flex flex-col gap-2">
                <div className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between border border-slate-100 shadow-sm">
                  <div>
                    <div className="text-[11px] font-extrabold text-slate-800">
                      Welcome, <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">School Academy</span>
                    </div>
                    <div className="text-[7px] text-slate-400 mt-0.5">Everything is on track. 1,284 students and 87 teachers are active across 6 class levels today.</div>
                  </div>
                  <div className="shrink-0 border border-slate-100 rounded-xl px-3 py-2 text-right shadow-sm bg-slate-50">
                    <div className="text-[6px] text-blue-500 font-bold uppercase tracking-widest mb-0.5">Today's Pulse</div>
                    <div className="text-[8px] font-bold text-slate-700">Friday, March 27, 2026</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
                  <div className="col-span-2 bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <div className="text-[9px] font-bold text-slate-800 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-slate-400" />
                          Academic Performance
                        </div>
                        <div className="text-[6px] text-slate-400">Institutional cumulative growth &amp; trends</div>
                      </div>
                      <div className="bg-green-100 text-green-700 text-[6px] font-bold rounded-full px-2 py-0.5">Live Analytics</div>
                    </div>
                    <div className="flex-1 relative px-1 pt-1 pb-0">
                      <svg viewBox="0 0 220 80" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="areaGradD" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {[10,25,40,55,70].map(y => (
                          <line key={y} x1="0" y1={y} x2="220" y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
                        ))}
                        <path d="M0,62 C18,58 36,50 55,44 C73,38 91,48 110,36 C128,24 146,30 165,18 C183,6 201,12 220,8 L220,80 L0,80 Z" fill="url(#areaGradD)" />
                        <path d="M0,62 C18,58 36,50 55,44 C73,38 91,48 110,36 C128,24 146,30 165,18 C183,6 201,12 220,8" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        {[[0,62],[55,44],[110,36],[165,18],[220,8]].map(([x,y],i) => (
                          <circle key={i} cx={x} cy={y} r="2" fill="#3b82f6" stroke="white" strokeWidth="1" />
                        ))}
                        <path d="M0,72 C18,70 36,66 55,62 C73,58 91,64 110,58 C128,52 146,56 165,50 C183,44 201,46 220,42" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,2" strokeLinecap="round" />
                      </svg>
                      <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-1 pr-1">
                        {['100%','75%','50%','25%'].map(l => (
                          <div key={l} className="text-[4.5px] text-slate-300 leading-none">{l}</div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between px-2 mt-0.5">
                      {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct'].map(m => (
                        <div key={m} className="text-[5px] text-slate-300">{m}</div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 px-2 mt-1">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-0.5 bg-blue-500 rounded" />
                        <span className="text-[5.5px] text-slate-400">This Year</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-0.5 bg-slate-300 rounded" />
                        <span className="text-[5.5px] text-slate-400">Last Year</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1 grid grid-cols-2 gap-2">
                    {[
                      { label: 'TEACHERS', value: '87', bg: 'bg-blue-600', icon: '👨‍🏫' },
                      { label: 'STUDENTS', value: '1,284', bg: 'bg-green-600', icon: '🎓' },
                      { label: 'CLASSES', value: '24', bg: 'bg-orange-500', icon: '🏫' },
                      { label: 'SUBJECTS', value: '62', bg: 'bg-purple-600', icon: '📚' },
                    ].map(card => (
                      <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-2 gap-1">
                        <div className={`${card.bg} w-6 h-6 rounded-xl flex items-center justify-center text-[10px]`}>{card.icon}</div>
                        <div className="text-[6px] font-black text-slate-400 uppercase tracking-widest">{card.label}</div>
                        <div className="text-[13px] font-extrabold text-slate-800 leading-none">{card.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── MOBILE MOCKUP (below md) ───────────────────────────────────── */}
          <div className="relative flex justify-center md:hidden w-full">
            {/* Phone shell */}
            <div className="relative w-[240px] rounded-[2.5rem] border-[6px] border-slate-800 shadow-2xl bg-slate-800 overflow-hidden">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-800 rounded-b-2xl z-20" />
              {/* Screen */}
              <div className="bg-slate-50 rounded-[2rem] overflow-hidden relative" style={{minHeight: '420px'}}>
                
                {/* Mobile header bar */}
                <div className="bg-white border-b border-slate-100 flex items-center justify-between px-4 py-3 pt-6">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-600 rounded-xl flex items-center justify-center">
                      <School className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-[8px] font-extrabold text-slate-900 leading-none">Klaxtrix</div>
                      <div className="text-[5px] text-slate-400 uppercase tracking-widest">Admin Portal</div>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-black">SA</div>
                </div>

                {/* Mobile dashboard body */}
                <div className="p-3 flex flex-col gap-3">

                  {/* Welcome card */}
                  <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/30">
                    <div className="text-[8px] font-bold opacity-70 uppercase tracking-widest mb-1">Welcome back</div>
                    <div className="text-[13px] font-extrabold leading-tight">School Academy</div>
                    <div className="text-[7px] opacity-80 mt-1">1,284 students · 87 teachers · 6 levels</div>
                    <div className="mt-3 bg-white/20 rounded-xl px-3 py-1.5 inline-flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[7px] font-bold">Friday, Mar 27, 2026</span>
                    </div>
                  </div>

                  {/* Quick stat row */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Teachers', value: '87', icon: '👨‍🏫', bg: 'bg-blue-50', text: 'text-blue-700' },
                      { label: 'Students', value: '1,284', icon: '🎓', bg: 'bg-green-50', text: 'text-green-700' },
                    ].map(c => (
                      <div key={c.label} className={`${c.bg} rounded-2xl p-3 flex items-center gap-2`}>
                        <span className="text-base">{c.icon}</span>
                        <div>
                          <div className={`text-[14px] font-extrabold ${c.text} leading-none`}>{c.value}</div>
                          <div className="text-[7px] text-slate-500 mt-0.5">{c.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Performance mini-card */}
                  <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[9px] font-bold text-slate-800">Academic Performance</div>
                      <div className="bg-green-100 text-green-700 text-[6px] font-bold rounded-full px-2 py-0.5">Live</div>
                    </div>
                    <svg viewBox="0 0 200 50" className="w-full h-10" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="areaGradM" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,40 C30,35 60,28 100,20 C140,12 170,8 200,5 L200,50 L0,50 Z" fill="url(#areaGradM)" />
                      <path d="M0,40 C30,35 60,28 100,20 C140,12 170,8 200,5" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* Nav items */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {['Classes & Subjects', 'Attendance Intel', 'Academic Results'].map((item, i) => (
                      <div key={item} className={`flex items-center gap-3 px-4 py-2.5 ${i < 2 ? 'border-b border-slate-50' : ''}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        <span className="text-[8px] font-semibold text-slate-600">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Glow behind the phone */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-20 bg-primary/20 blur-[60px] rounded-full -z-10" />
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
      title: "Custom Branded Portals",
      description: "Stunning, high-fidelity interfaces for students, parents, and teachers. Perfectly optimized for clarity and engagement.",
      icon: School,
      color: "text-yellow-500",
    }
  ];

  return (
    <section id="features" className="py-24 bg-muted/30">
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

export function LandingSolutions() {
  const solutions = [
    {
      title: "Nursery Education",
      description: "Gentle, focused management for early childhood centers. Track developmental milestones and maintain close parent communication.",
      icon: Baby,
      color: "text-rose-500",
      features: ["Milestones", "Daily Reports", "Parent Chat"]
    },
    {
      title: "Primary Education",
      description: "Comprehensive tools for foundational learning. Manage attendance, simplify grading, and track student growth with ease.",
      icon: BookOpen,
      color: "text-blue-500",
      features: ["Attendance", "Simple Grading", "Assessments"]
    },
    {
      title: "Secondary Education",
      description: "Advanced management for high schools. Streamline subject selection, exam processing, and detailed academic performance.",
      icon: School,
      color: "text-indigo-500",
      features: ["Exam Center", "Subject Mgt", "Performance"]
    }
  ];

  return (
    <section id="solutions" className="py-12 md:py-24 bg-background">
       <div className="container px-4 mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
             <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4 tracking-tight">Tailored Solutions for Every Institution</h2>
             <p className="text-lg text-muted-foreground leading-relaxed">
                From the first steps in nursery to the graduation halls of secondary school, Klaxtrix provides the perfect foundation.
             </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
             {solutions.map((sol, i) => (
                <div key={i} className="group p-1 rounded-[2.5rem] bg-gradient-to-br from-border/50 to-transparent hover:from-primary/20 transition-all duration-500">
                   <div className="h-full p-8 rounded-[2.25rem] bg-background border border-border/50 flex flex-col">
                      <div className={`w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                         <sol.icon className={`w-7 h-7 ${sol.color}`} />
                      </div>
                      <h3 className="text-2xl font-heading font-bold mb-4">{sol.title}</h3>
                      <p className="text-muted-foreground leading-relaxed mb-8 flex-1">{sol.description}</p>
                      
                      <div className="space-y-3">
                         {sol.features.map(f => (
                            <div key={f} className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                               <CheckCircle2 className="w-4 h-4 text-primary" />
                               {f}
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
             ))}
          </div>
       </div>
    </section>
  );
}

export function LandingContact() {
  return (
    <section id="contact" className="py-12 md:py-24 bg-muted/30">
       <div className="container px-4 mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-center">
             
             {/* Left Column: Info */}
             <div className="space-y-8 md:space-y-10">
                <div className="max-w-md">
                   <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6 tracking-tight">Let's Pioneer <br className="hidden md:block" /> Academic Excellence.</h2>
                   <p className="text-lg text-muted-foreground leading-relaxed">
                      Transforming an institution is a big step. Our specialized team is ready to help you navigate the future of school management.
                   </p>
                </div>
                
                <div className="space-y-6">
                   <div className="flex items-center gap-5 group">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                         <MessageSquare className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                         <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Us</div>
                         <div className="text-lg font-semibold">institutions@klaxtrix.com</div>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-5 group">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                         <PhoneCall className="w-6 h-6 text-purple-500" />
                      </div>
                      <div>
                         <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Support Line</div>
                         <div className="text-lg font-semibold">+234 812 345 6789</div>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-5 group">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                         <MapPin className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div>
                         <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Main HQ</div>
                         <div className="text-lg font-semibold">Victoria Island, Lagos, Nigeria</div>
                      </div>
                   </div>
                </div>
             </div>
             
             {/* Right Column: Form */}
             <div className="relative">
                <div className="absolute inset-0 bg-primary/10 blur-[100px] -z-10 rounded-full" />
                <div className="p-6 md:p-12 rounded-3xl md:rounded-[2.5rem] bg-background border border-border/50 shadow-2xl shadow-primary/5">
                   <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                      <div className="grid md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase px-1">Institution Name</label>
                            <input type="text" placeholder="Glory Days Academy" className="w-full px-5 py-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none transition-all" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase px-1">Contact Email</label>
                            <input type="email" placeholder="admin@school.com" className="w-full px-5 py-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none transition-all" />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase px-1">Subject</label>
                         <select className="w-full px-5 py-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none transition-all appearance-none cursor-pointer">
                            <option>Institutional Demo Request</option>
                            <option>Technical Partnership</option>
                            <option>Migration Support</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase px-1">Message</label>
                         <textarea rows={4} placeholder="How can we help your institution?" className="w-full px-5 py-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none" />
                      </div>
                      <Button className="w-full py-7 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                         Send Message
                      </Button>
                   </form>
                </div>
             </div>
             
          </div>
       </div>
    </section>
  );
}
