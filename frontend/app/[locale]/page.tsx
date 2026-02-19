'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Milk, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  LayoutGrid,
  Fingerprint,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslations } from "next-intl";


const liquidEntrance = {
  initial: { opacity: 0, scale: 0.95, y: 30, filter: "blur(20px)" },
  animate: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] }
};

const FeatureCard = ({ title, desc, icon, delay = 0 }: { title: string, desc: string, icon: React.ReactNode, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.8 }}
    className="group relative p-8 rounded-3xl glass-card"
  >
    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.1] group-hover:scale-110 transition-all duration-700">
      {icon}
    </div>
    <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 w-fit mb-6 group-hover:shadow-glow-primary transition-all">
      <div className="text-primary">{icon}</div>
    </div>
    <h3 className="text-xl font-heading font-black tracking-tight mb-3 text-foreground/90 uppercase italic group-hover:text-primary transition-colors">{title}</h3>
    <p className="text-muted-foreground font-medium leading-relaxed text-sm">{desc}</p>
  </motion.div>
);

export default function LandingPage() {

  const tHero = useTranslations('Landing.hero');
  const tFeatures = useTranslations('Landing.features');
  const tNav = useTranslations('Landing.nav');
  const tFooter = useTranslations('Landing.footer');

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30 overflow-x-hidden text-foreground">
      {/* atmospheric lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[180px] animate-pulse-glow opacity-40" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[180px] animate-pulse-glow opacity-30" style={{ animationDelay: '2s' }} />
      </div>

      <header className="fixed top-0 left-0 right-0 z-[100] h-20 border-b border-white/[0.05] bg-background/40 backdrop-blur-2xl">
        <div className="container mx-auto h-full flex items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105">
            <div className="p-2 rounded-xl bg-primary shadow-glow-primary">
              <Milk className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-heading font-black text-2xl tracking-tighter text-foreground italic uppercase">{tNav('dairyOs')}</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-6">
              {[
                { label: tNav('features'), href: "#" },
                { label: tNav('market'), href: "#" },
                { label: tNav('security'), href: "#" }
              ].map(item => (
                <Link key={item.label} href={item.href} className="font-micro hover:text-primary transition-colors uppercase tracking-widest text-[10px] font-bold">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
            <Button asChild className="rounded-full bg-white text-black hover:bg-primary hover:text-white px-6 font-heading font-black italic transition-all duration-500">
              <Link href="/login" className="flex items-center gap-2">
                {tNav('authorize')} <Fingerprint className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="pt-32 pb-16 md:pt-56 md:pb-32 container px-6 mx-auto text-center">
          <motion.div {...liquidEntrance}>
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-border bg-card/10 backdrop-blur-3xl shadow-glass-elev mb-10">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
              <span className="font-micro text-primary/80">{tHero('version')}</span>
            </div>
            
            <h1 className="font-big text-foreground italic uppercase mb-8">
              {tHero('maximum')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-accent animate-gradient-text">
                {tHero('efficiency')}
              </span>
            </h1>
            
            <p className="max-w-2xl mx-auto text-muted-foreground text-lg md:text-xl font-medium tracking-tight mb-12">
              {tHero('subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button asChild size="lg" className="h-16 px-10 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-xl font-heading font-black italic shadow-2xl transition-all duration-500 group">
                <Link href="/login" className="flex items-center gap-3">
                  {tHero('initialize')} <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-16 px-10 rounded-2xl border-border glass-card text-foreground hover:bg-accent text-xl font-heading font-black italic">
                <Link href="#" className="flex items-center gap-3">
                  {tHero('status')} <Activity className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </section>

        <section className="py-24 container px-6 mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
            <div className="max-w-xl">
              <span className="font-small mb-4 block uppercase text-primary tracking-[0.3em] font-black">{tFeatures('core')}</span>
              <h2 className="font-medium-big text-foreground uppercase italic tracking-tighter">
                {tFeatures('mainTitle')}
              </h2>
            </div>
            <p className="text-muted-foreground text-sm max-w-xs font-medium border-l-2 border-primary/20 pl-6 py-2">
              {tFeatures('mainDesc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="w-6 h-6" />}
              title={tFeatures('realtimeTitle')}
              desc={tFeatures('realtimeDesc')}
              delay={0.1}
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-6 h-6" />}
              title={tFeatures('securityTitle')}
              desc={tFeatures('securityDesc')}
              delay={0.2}
            />
            <FeatureCard 
              icon={<LayoutGrid className="w-6 h-6" />}
              title={tFeatures('dashboardTitle')}
              desc={tFeatures('dashboardDesc')}
              delay={0.3}
            />
          </div>
        </section>
      </main>

      <footer className="py-20 border-t border-white/[0.05] bg-black/40 relative z-10">
        <div className="container px-6 mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
            <Milk className="h-6 w-6 text-primary" />
            <span className="font-heading font-black text-xl tracking-tighter text-white italic uppercase">{tNav('dairyOs')}</span>
          </div>
          <p className="text-white/20 font-micro tracking-widest uppercase text-[10px]">
            {tFooter('copyright')}
          </p>
          <div className="flex gap-8">
            {[
              { label: tFooter('privacy'), href: "#" },
              { label: tFooter('legal'), href: "#" },
              { label: tFooter('infrastructure'), href: "#" }
            ].map(item => (
              <Link key={item.label} href={item.href} className="font-micro text-white/30 hover:text-white transition-colors uppercase tracking-widest text-[10px] font-bold">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
