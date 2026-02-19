'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useTransition, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (nextLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
      setIsOpen(false);
    });
  };

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  return (
    <div className="relative">
      <button
        id="language-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-2xl glass border border-border/10 hover:border-primary/50 transition-all duration-300",
          isOpen && "bg-foreground/10 border-primary/50",
          isPending && "opacity-50 pointer-events-none"
        )}
      >
        <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
          <Globe className="w-4 h-4 text-primary" />
        </div>
        <div className="flex flex-col items-start text-foreground">
          <span className="text-[10px] uppercase text-foreground/40 font-bold tracking-widest leading-none mb-1">Language</span>
          <span className="text-sm font-bold text-foreground leading-none">{currentLang.native}</span>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-foreground/40 ml-1 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[110]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute right-0 top-[110%] z-[120] w-64 bg-background dark:bg-[#0a0a0a] border border-border/10 rounded-3xl p-2 shadow-2xl backdrop-blur-3xl"
              style={{ minHeight: 'fit-content' }}
            >
              <div className="flex flex-col gap-1">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    id={`lang-option-${lang.code}`}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all cursor-pointer",
                      locale === lang.code ? "bg-primary text-white" : "text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
                    )}
                  >
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-black uppercase tracking-tight">{lang.native}</span>
                      <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">{lang.label}</span>
                    </div>
                    {locale === lang.code && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
