import React from 'react';
import Link from 'next/link';
import { LandingHeader } from '@/components/landing/landing-header';
import { School, FileText, CheckCircle2, ShieldAlert, Scale, CreditCard, Ban, RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Terms of Service | Klaxtrix SMS-EDU',
  description: 'Review the legal terms, service level agreements, and usage obligations governing the Klaxtrix multi-tenant SaaS platform.',
};

export default function TermsOfServicePage() {
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
            <FileText className="w-3.5 h-3.5" /> Master Subscription &amp; Services Agreement
          </div>
          <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight mb-4 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
            These terms govern access to and use of the Klaxtrix SMS-EDU platform by educational institutions, administrators, teachers, students, and parents.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground font-medium">
            <span>Last Updated: August 30, 2026</span>
            <span>•</span>
            <span>Effective Version: 2.4.0</span>
            <span>•</span>
            <span>Governing Law: Federal Republic of Nigeria</span>
          </div>
        </div>
      </section>

      {/* Main Terms Content */}
      <section className="py-16 container px-4 mx-auto max-w-5xl">
        <div className="grid lg:grid-cols-4 gap-12">
          
          {/* Quick Navigation Sidebar */}
          <aside className="hidden lg:block lg:col-span-1 space-y-2 sticky top-28 h-fit p-4 rounded-2xl bg-muted/30 border border-border/50 text-xs">
            <div className="font-bold text-foreground uppercase tracking-wider mb-3 px-2">Table of Contents</div>
            <nav className="space-y-1">
              {[
                { href: '#acceptance', label: '1. Acceptance of Terms' },
                { href: '#subdomain', label: '2. Subdomain & Accounts' },
                { href: '#acceptable-use', label: '3. Acceptable Use Policy' },
                { href: '#ip-ownership', label: '4. Data & IP Ownership' },
                { href: '#billing', label: '5. Subscriptions & Billing' },
                { href: '#sla', label: '6. Service Level Agreement' },
                { href: '#termination', label: '7. Term & Termination' },
                { href: '#liability', label: '8. Limitation of Liability' },
                { href: '#law', label: '9. Governing Law & Dispute' },
                { href: '#modifications', label: '10. Terms Modifications' },
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
            <div id="acceptance" className="space-y-4 scroll-mt-28">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Acceptance of Terms</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                By registering an educational institution, logging into a tenant portal (`[subdomain].klaxtrix.com`), or accessing the Klaxtrix SMS-EDU platform, you (&quot;Subscriber&quot;, &quot;School&quot;, or &quot;User&quot;) agree to be legally bound by this Master Services Agreement (&quot;Terms of Service&quot;). If you are creating an account on behalf of an educational institution, you represent and warrant that you possess full legal authority to bind that institution to these Terms.
              </p>
            </div>

            {/* Section 2 */}
            <div id="subdomain" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Subdomain Allocation &amp; Account Provisioning</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Upon successful onboarding and registration:
              </p>
              <ul className="space-y-3">
                <li className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <strong className="text-foreground block font-bold mb-1">A. Tenant Subdomain Reservation</strong>
                  <span className="text-muted-foreground text-sm">Each subscribing institution is assigned a unique subdomain identifier (e.g. `glorydays.klaxtrix.com`). Subdomain handles remain the property of Klaxtrix and may not violate third-party trademark rights.</span>
                </li>
                <li className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <strong className="text-foreground block font-bold mb-1">B. Administrative Responsibility</strong>
                  <span className="text-muted-foreground text-sm">School administrators are responsible for managing access credentials for staff, teachers, students, and parents. Administrators must immediately report any suspected unauthorized access to `institutions@klaxtrix.com`.</span>
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div id="acceptable-use" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center font-bold">3</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Acceptable Use Policy</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                The Klaxtrix platform must be utilized strictly for legitimate educational administration. Users are prohibited from engaging in any of the following:
              </p>
              <div className="grid sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-1">
                  <strong className="text-red-600 block font-bold flex items-center gap-1.5">
                    <Ban className="w-4 h-4" /> Unauthorized Penetration &amp; Scraping
                  </strong>
                  <span className="text-muted-foreground text-xs">Attempting to bypass tenant connection resolvers, reverse-engineer encryption keys, or perform automated data scraping.</span>
                </div>
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-1">
                  <strong className="text-red-600 block font-bold flex items-center gap-1.5">
                    <Ban className="w-4 h-4" /> Fraudulent Credentials
                  </strong>
                  <span className="text-muted-foreground text-xs">Creating unauthorized admin accounts or falsifying student admission records, transcripts, or payment receipts.</span>
                </div>
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-1">
                  <strong className="text-red-600 block font-bold flex items-center gap-1.5">
                    <Ban className="w-4 h-4" /> Malicious Payload Transmissions
                  </strong>
                  <span className="text-muted-foreground text-xs">Uploading malicious image payloads via passport photo inputs or injecting cross-site scripting (XSS) scripts into assignment portals.</span>
                </div>
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-1">
                  <strong className="text-red-600 block font-bold flex items-center gap-1.5">
                    <Ban className="w-4 h-4" /> Unsolicited Messaging
                  </strong>
                  <span className="text-muted-foreground text-xs">Using Termii SMS integrations for spam or non-educational broadcast messaging.</span>
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div id="ip-ownership" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">4</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Data &amp; Intellectual Property Ownership</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
                  <strong className="text-foreground block font-bold text-base">Subscriber Content (School Data)</strong>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Subscribing institutions retain 100% ownership of all student records, academic results, attendance logs, and institutional logos (&quot;Subscriber Data&quot;). Klaxtrix claims no intellectual property rights over institution-submitted records.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
                  <strong className="text-foreground block font-bold text-base">Klaxtrix Platform &amp; Software</strong>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Klaxtrix retains all rights, title, and interest in the platform software, source code, database architectures, user interface designs, logos, and proprietary algorithms.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div id="billing" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">5</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Subscription Fees &amp; Payment Processing</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Platform subscription plans, feature tiers, and fee structures are governed by the following payment conditions:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground text-sm font-bold block">Payment Gateway (Paystack)</strong>
                    <span className="text-xs text-muted-foreground">All subscription fees and student online fee collections are processed securely via Paystack. Applicable gateway processing fees are disclosed prior to checkout.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <RefreshCw className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground text-sm font-bold block">Term Renewal &amp; Invoicing</strong>
                    <span className="text-xs text-muted-foreground">Subscriptions renew on a per-term or annual basis as configured by the school administration. Failure to settle invoices within 14 days of due date may result in portal access suspension.</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Section 6 */}
            <div id="sla" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">6</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Service Level Agreement (SLA) &amp; Maintenance</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Klaxtrix commits to maintaining a **99.9% uptime uptime guarantee** for core cloud infrastructure. Scheduled system upgrades and database optimizations are performed during off-peak hours with prior administrative notification.
              </p>
            </div>

            {/* Section 7 */}
            <div id="termination" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">7</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Term &amp; Termination</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Either party may terminate this agreement with 30 days written notice. Upon termination, Klaxtrix grants the subscribing institution a **30-day Grace Period** to export all student rosters, broadsheets, and transcripts. Following the grace period, tenant database schemas are permanently decommissioned.
              </p>
            </div>

            {/* Section 8 */}
            <div id="liability" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">8</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Limitation of Liability</h2>
              </div>
              <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/15 space-y-2 text-xs sm:text-sm">
                <p className="text-muted-foreground leading-relaxed">
                  To the maximum extent permitted by applicable law, Klaxtrix SMS-EDU and its affiliates shall not be liable for indirect, incidental, consequential, or punitive damages resulting from user account compromise, internet connectivity failures, or unverified grading data entered by school personnel.
                </p>
                <p className="text-muted-foreground font-semibold">
                  In all events, Klaxtrix&apos;s aggregate liability shall not exceed the total subscription fees paid by the institution during the preceding twelve (12) month period.
                </p>
              </div>
            </div>

            {/* Section 9 */}
            <div id="law" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">9</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Governing Law &amp; Dispute Resolution</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                These Terms are governed by and construed in accordance with the laws of the **Federal Republic of Nigeria**. Any dispute arising from or in connection with these Terms shall first be submitted to good-faith mediation. If unresolved within 30 days, the dispute shall be resolved through binding arbitration in Lagos State, Nigeria.
              </p>
            </div>

            {/* Section 10 */}
            <div id="modifications" className="space-y-4 scroll-mt-28 border-t border-border/40 pt-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">10</div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Modifications to Terms</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Klaxtrix reserves the right to update these Terms of Service to reflect system enhancements or legal compliance changes. Material updates will be communicated via tenant admin dashboard notifications at least 15 days prior to taking effect.
              </p>
              <div className="p-6 rounded-2xl bg-muted/40 border border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6">
                <div>
                  <div className="text-sm font-bold text-foreground">Questions Regarding Terms?</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Contact our legal and support team: institutions@klaxtrix.com</div>
                </div>
                <Button size="sm" className="rounded-full font-semibold" asChild>
                  <a href="mailto:institutions@klaxtrix.com">Legal Contact</a>
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
