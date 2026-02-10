import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Milk, ArrowRight, ShieldCheck, Zap, Smartphone } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b glass sticky top-0 z-50">
        <Link className="flex items-center justify-center gap-2" href="#">
          <Milk className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl tracking-tight">DairyOS</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="/login">
            Login
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold font-sans tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-gradient">
                  Modern Dairy Management
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl dark:text-gray-400">
                  Reliable, fast, and mobile-first. Trust = Money.
                  Built for modern dairy owners and their customers.
                </p>
              </div>
              <div className="space-x-4">
                <Button asChild size="lg" className="rounded-full px-8">
                  <Link href="/login">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-slate-950">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 rounded-full bg-primary/10">
                  <Smartphone className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Mobile First</h2>
                <p className="text-muted-foreground">
                  Quick adjustments and bill viewing right from your phone.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 rounded-full bg-primary/10">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Fast Data Entry</h2>
                <p className="text-muted-foreground">
                  Record 50+ customers in under 60 seconds. Zero bullshit.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 rounded-full bg-primary/10">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Trustworthy</h2>
                <p className="text-muted-foreground">
                  Transparent billing and instant payment confirmations.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t font-sans text-xs text-muted-foreground">
        <p>© 2026 DairyOS. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
