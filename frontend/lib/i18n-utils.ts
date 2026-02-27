import { enUS, kn, hi, te, ta } from "date-fns/locale"
import type { Locale } from "date-fns"

export const DEFAULT_LOCALE = "en"

export const DATE_FNS_LOCALES: Record<string, Locale> = {
    en: enUS,
    kn: kn,
    hi: hi,
    te: te,
    ta: ta,
    ml: enUS, // Fallback for missing Malayalam locale in date-fns
}

export function getDateFnsLocale(locale: string) {
    return DATE_FNS_LOCALES[locale] || enUS
}

export function formatCurrency(amount: number, locale: string = "en-IN") {
    // Ensure we use the correct BCP 47 locale tag if possible
    const localeTag = locale === "en" ? "en-IN" : `${locale}-IN`
    try {
        return amount.toLocaleString(localeTag, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
    } catch {
        // If specific locale-IN fails, fallback to en-IN
        return amount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
    }
}

/**
 * Maps backend status strings to i18n keys for consistent localization.
 * Usage: t(`Common.status.${getStatusKey(status)}`)
 */
export function getStatusKey(status: string | undefined | null): string {
    if (!status) return "PENDING"
    const s = status.toUpperCase()
    const validStatuses = [
        "PAID", "UNPAID", "PENDING", "APPROVED",
        "REJECTED", "DELIVERED", "CANCELLED",
        "SKIPPED", "ACTIVE", "INACTIVE"
    ]
    return validStatuses.includes(s) ? s : "PENDING"
}
