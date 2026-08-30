import React from 'react';
import Link from 'next/link';
import { LandingHeader } from '@/components/landing/landing-header';
import { School, ShieldCheck, Lock, Eye, FileText, Database, Server, UserCheck, Bell, HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Privacy Policy | Klaxtrix SMS-EDU',
  description: 'Understand how Klaxtrix collects, protects, isolates, and manages data for educational institutions, students, teachers, and parents.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background selection:bg-primary/30 selection:text-primary">
      <LandingHeader />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden border-b border-border/50 bg-gradient-to-b from-primary/5 via-transparent to-transparent">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="sm" className="rounded-full gap-2 text-muted-foreground hover:text-foreground" asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </Link>
            </Button>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">
            <ShieldCheck className="w-3.5 h-3.5" /> Data Protection & Privacy Standard
          </div>
          <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight mb-4 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
            Klaxtrix SMS-EDU is committed to strict data security, tenant isolation, and regulatory compliance. This policy details how institutional data, student records, and portal interactions are processed.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground font-medium">
            <span>Last Updated: August 30, 2026</span>
            <span>•</span>
            <span>Effective Version: 2.4.0</span>
            <span>•</span>
            <span>Compliance: NDPR / NDPA 2023 &amp; Global SaaS Standards</span>
          </div>
        </div>
      </section>

      {/* Main Policy Content */}
      <section className="py-16 container px-4 mx-auto max-w-5xl">
        <div className="grid lg:grid-cols-4 gap-12">
          
          {/* Quick Navigation Sidebar */}
          <aside className="hidden lg:block lg:col-span-1 space-y-2 sticky top-28 h-fit p-4 rounded-2xl bg-muted/30 border border-border/50 text-xs">
            <div className="font-bold text-foreground uppercase tracking-wider mb-3 px-2">Table of Contents</div>
            <nav className="space-y-1">
              {[
                { href: '#overview', label: '1. Overview & Scope' },
                { href: '#collection', label: '2. Information We Collect' },
                { href: '#child-privacy', label: '3. Student & Child Data' },
                { href: '#usage', label: '4. How We Use Information' },
                { href: '#isolation', label: '5. Tenant Data Isolation' },
                { href: '#processors', label: '6. Third-Party Services' },
                { href: '#retention', label: '7. Retention & Sovereignty' },
                { href: '#rights', label: '8. Institutional Rights' },
                { href: '#contact', label: '9. Contact Data Officer' },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors font-medium"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Policy Text Body */}
          <div className="lg:col-span-3 space-y-12 text-foreground/90 leading-relaxed text-sm sm:text-base">
            
            {/* Section 1 */}
            <div id="overview" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Overview &amp; Scope</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Klaxtrix SMS-EDU (&quot;Klaxtrix&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates a multi-tenant cloud-based School Management System (SaaS). We serve educational institutions, including early childhood centers, primary schools, and secondary academies (&quot;Subscribers&quot; or &quot;Institutions&quot;).
              </p>
              <p className="text-muted-foreground leading-relaxed">
                This Privacy Policy applies to all services provided under the Klaxtrix domain (`klaxtrix.com`, `klaxtrix.site`) and custom tenant portals (`[subdomain].klaxtrix.com`). Educational institutions act as the primary **Data Controllers** of their academic and student data, while Klaxtrix operates as a secure **Data Processor**.
              </p>
            </div>

            {/* Section 2 */}
            <div id="collection" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Information We Collect</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                To manage institutional operations, grade centers, and parent communications, Klaxtrix collects and processes the following data categories:
              </p>
              <ul className="space-y-3 pl-2">
                <li className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <strong className="text-foreground block mb-1">A. Institutional &amp; Administrative Data</strong>
                  <span className="text-muted-foreground text-sm">School name, domain, motto, official address, state/LGA of origin, bank payout details, school emblem/logo, and administrative credentials.</span>
                </li>
                <li className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <strong className="text-foreground block mb-1">B. Student Personal &amp; Demographic Data</strong>
                  <span className="text-muted-foreground text-sm">Full student names, assigned admission numbers, dates of birth, passport photographs, gender, state/LGA of origin, religion, previous school records, and optional medical details (blood group, genotype, allergies).</span>
                </li>
                <li className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <strong className="text-foreground block mb-1">C. Guardian &amp; Parent Data</strong>
                  <span className="text-muted-foreground text-sm">Full names, phone numbers, email addresses, residential addresses, and parent-student relationship mapping.</span>
                </li>
                <li className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <strong className="text-foreground block mb-1">D. Academic &amp; Assessment Records</strong>
                  <span className="text-muted-foreground text-sm">Class enrollments, attendance logs, timetable schedules, continuous assessment scores, examination broadsheets, report card entries, and assignment submissions.</span>
                </li>
                <li className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <strong className="text-foreground block mb-1">E. Financial Transaction Data</strong>
                  <span className="text-muted-foreground text-sm">School fee invoices, payment receipts, Paystack transaction reference identifiers, and payment status. <em>Note: Sensitive debit/credit card numbers are processed directly by Paystack (PCI-DSS Level 1 compliant) and are never stored on Klaxtrix servers.</em></span>
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div id="child-privacy" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">3</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Student &amp; Child Data Protection</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Because Klaxtrix serves educational institutions with minor students (under 18 years of age), child privacy protection is integrated into our core system architecture:
              </p>
              <div className="p-5 rounded-2xl bg-purple-500/5 border border-purple-500/15 space-y-3">
                <div className="flex items-center gap-2 text-purple-600 font-bold text-sm uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" /> Educational Authorization (*In Loco Parentis*)
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Subscribing schools obtain parent/guardian consent during student admission. Klaxtrix processes minor student data strictly on behalf of the subscribing school for legitimate educational purposes. Student data is never subjected to targeted advertising, behavioral profiling, or commercial marketing.
                </p>
              </div>
            </div>

            {/* Section 4 */}
            <div id="usage" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">4</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">How We Use Information</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                We use collected information solely for essential educational and platform operations:
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border/50 bg-background">
                  <strong className="text-foreground block text-sm font-bold mb-1">Academic Administration</strong>
                  <p className="text-xs text-muted-foreground">Generating terminal report cards, managing attendance tracking, calculating grade point averages, and maintaining official transcripts.</p>
                </div>
                <div className="p-4 rounded-xl border border-border/50 bg-background">
                  <strong className="text-foreground block text-sm font-bold mb-1">Parent Communication</strong>
                  <p className="text-xs text-muted-foreground">Delivering real-time portal updates, result release alerts, fee notices, and automated SMS messages via Termii.</p>
                </div>
                <div className="p-4 rounded-xl border border-border/50 bg-background">
                  <strong className="text-foreground block text-sm font-bold mb-1">Financial Reconciliation</strong>
                  <p className="text-xs text-muted-foreground">Enabling online school fee payments via Paystack, generating payment receipts, and providing revenue analytics to school admins.</p>
                </div>
                <div className="p-4 rounded-xl border border-border/50 bg-background">
                  <strong className="text-foreground block text-sm font-bold mb-1">Platform Security</strong>
                  <p className="text-xs text-muted-foreground">Enforcing role-based access control (RBAC), detecting suspicious login activities, and maintaining system health monitoring.</p>
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div id="isolation" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">5</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Tenant Data Isolation &amp; Security Architecture</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Klaxtrix uses a high-fidelity Partner-Cloud Architecture to ensure complete tenant data segregation:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground text-sm font-bold block">Strict Subdomain &amp; Schema Isolation</strong>
                    <span className="text-xs text-muted-foreground">Database queries are dynamically scoped using connection resolvers by `school_id`. No tenant can query or access another institution&apos;s database records.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground text-sm font-bold block">End-to-End Encryption</strong>
                    <span className="text-xs text-muted-foreground">All data in transit is protected using TLS 1.3 encryption. Sensitive database attributes are encrypted at rest using AES-256 with Master Key key rotation.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Server className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground text-sm font-bold block">Progressive Web App (PWA) Offline Cache Security</strong>
                    <span className="text-xs text-muted-foreground">PWA service workers cache static application assets locally. User credentials and sensitive academic records are strictly excluded from client-side persistent storage.</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Section 6 */}
            <div id="processors" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">6</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Third-Party Data Processors</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                We partner with trusted infrastructure providers to deliver cloud hosting, payment gateways, and SMS alerts:
              </p>
              <div className="border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/40 text-xs sm:text-sm">
                <div className="p-4 flex items-center justify-between bg-muted/20">
                  <div>
                    <strong className="text-foreground block font-bold">Supabase PostgreSQL &amp; Storage</strong>
                    <span className="text-muted-foreground text-xs">Relational database storage &amp; encrypted passport photos</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs">SOC2 Type II</span>
                </div>
                <div className="p-4 flex items-center justify-between bg-muted/20">
                  <div>
                    <strong className="text-foreground block font-bold">Paystack Payments</strong>
                    <span className="text-muted-foreground text-xs">School fee online payment processing</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 font-bold text-xs">PCI-DSS Level 1</span>
                </div>
                <div className="p-4 flex items-center justify-between bg-muted/20">
                  <div>
                    <strong className="text-foreground block font-bold">Termii SMS Gateway</strong>
                    <span className="text-muted-foreground text-xs">Transactional multi-channel SMS notifications</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 font-bold text-xs">Encrypted Gateway</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                * We do NOT sell, rent, or trade student, parent, or school data to any third-party advertisers or data brokers.
              </p>
            </div>

            {/* Section 7 */}
            <div id="retention" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">7</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Data Retention &amp; Institutional Sovereignty</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Institutions retain complete ownership of their data (&quot;Data Sovereignty&quot;). Data is retained for the duration of the institution&apos;s active subscription. Upon subscription termination or explicit administrative request, Klaxtrix provides a 30-day grace period for full academic record export, followed by permanent deletion from active database servers.
              </p>
            </div>

            {/* Section 8 */}
            <div id="rights" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">8</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Institutional &amp; User Rights</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Under applicable data protection regulations (such as NDPR / NDPA 2023), school administrators and guardians possess the following rights:
              </p>
              <div className="grid sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40">
                  <strong className="text-foreground block font-bold mb-1">Right to Access &amp; Rectify</strong>
                  <span className="text-muted-foreground">Request copies of or correct inaccurate student and parent profile records.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40">
                  <strong className="text-foreground block font-bold mb-1">Right to Data Portability</strong>
                  <span className="text-muted-foreground">Export academic results, student registries, and attendance logs in standard CSV/PDF formats.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40">
                  <strong className="text-foreground block font-bold mb-1">Right to Erasure (Archival)</strong>
                  <span className="text-muted-foreground">Archive or purge inactive student and teacher profiles from institutional dashboards.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40">
                  <strong className="text-foreground block font-bold mb-1">Right to Audit</strong>
                  <span className="text-muted-foreground">Request system compliance verification reports from Klaxtrix security officers.</span>
                </div>
              </div>
            </div>

            {/* Section 9 */}
            <div id="contact" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">9</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Contact Data Protection Officer</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions regarding this Privacy Policy or wish to submit a data protection inquiry, please contact our Data Security Team:
              </p>
              <div className="p-6 rounded-2xl bg-muted/40 border border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="text-sm font-bold text-foreground">Klaxtrix Data Protection Officer</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Email: institutions@klaxtrix.com | Support: +234 805 414 0785</div>
                </div>
                <Button size="sm" className="rounded-full font-semibold" asChild>
                  <a href="mailto:institutions@klaxtrix.com">Contact DPO</a>
                </Button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50 bg-background/50 backdrop-blur-sm">
        <div className="container px-4 mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold text-lg">Klaxtrix</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Klaxtrix Institution Management. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-sm text-primary hover:underline font-medium">Privacy Policy</Link>
            <Link href="/terms" className="text-sm text-primary hover:underline font-medium">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
