"use client"

import { useTranslation } from "@/context/language-context"
import { Language } from "@/lib/translations"

export function LanguageSelector() {
  const { language, setLanguage } = useTranslation()

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
  ]

  return (
    <div className="flex items-center gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
            language === lang.code
              ? "bg-indigo-500 text-white border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
              : "bg-foreground/[0.03] text-neutral-500 border-border hover:border-neutral-400 dark:hover:border-neutral-700"
          }`}
        >
          {lang.code}
        </button>
      ))}
    </div>
  )
}
