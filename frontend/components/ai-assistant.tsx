"use client"

import { useRef, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useMutation } from "@tanstack/react-query"
import {
    Bot,
    Send,
    X,
    Sparkles,
    Loader2,
    Minimize2
} from "lucide-react"
import { useTranslations } from "next-intl"
import { aiApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"

interface Message {
    role: "user" | "assistant"
    content: string
    timestamp: Date
}

export function AIAssistant() {
    const t = useTranslations("AIAssistant")
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState("")
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: t("greeting"), timestamp: new Date() }
    ])
    const scrollRef = useRef<HTMLDivElement>(null)

    const predefinedQueries = [
        { label: t("queries.milkTypes"), query: t("queries.milkTypesQuery") },
        { label: t("queries.a2Milk"), query: t("queries.a2MilkQuery") },
        { label: t("queries.storage"), query: t("queries.storageQuery") },
        { label: t("queries.billing"), query: t("queries.billingQuery") },
        { label: t("queries.delivery"), query: t("queries.deliveryQuery") },
        { label: t("queries.payment"), query: t("queries.paymentQuery") },
    ]

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const mutation = useMutation({
        mutationFn: async (message: string) => {
            return aiApi.chat(message)
        },
        onSuccess: (res: { response: string }) => {
            const assistantMsg: Message = {
                role: "assistant",
                content: res.response,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, assistantMsg])
        },
        onError: () => {
            const errorMessage: Message = {
                role: "assistant",
                content: t("error"),
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
        }
    })

    const handleSend = (text?: string) => {
        const messageContent = text || input.trim()
        if (!messageContent || mutation.isPending) return

        const userMessage: Message = {
            role: "user",
            content: messageContent,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        if (!text) setInput("")
        mutation.mutate(messageContent)
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 print:hidden">
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        className="mb-1"
                    >
                        <div className="glass px-3 py-1.5 rounded-xl shadow-xl border-primary/20 flex items-center gap-2 animate-pulse-glow-heavy">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-[11px] font-bold tracking-tight text-primary">
                                {t("discovery")}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Button
                onClick={() => setIsOpen(!isOpen)}
                size="icon"
                className={cn(
                    "h-12 w-12 rounded-full shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 group",
                    isOpen ? "bg-background border-border text-foreground hover:bg-muted" : "bg-primary text-primary-foreground hover:shadow-glow-primary"
                )}
                aria-label={isOpen ? t("close") : t("maximize")}
            >
                {isOpen ? (
                    <X className="h-5 w-5" />
                ) : (
                    <div className="relative">
                        <Bot className="h-6 w-6 transition-transform duration-500 group-hover:rotate-12" />
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1"
                        >
                            <div className="h-2.5 w-2.5 bg-white rounded-full flex items-center justify-center">
                                <Sparkles className="h-1.5 w-1.5 text-primary fill-primary" />
                            </div>
                        </motion.div>
                    </div>
                )}
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20, transformOrigin: "bottom right" }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="absolute bottom-16 right-0 w-[320px] h-[480px] glass-card overflow-hidden flex flex-col shadow-2xl rounded-2xl border-primary/10"
                    >
                        {/* Compact Header */}
                        <div className="p-3 border-b border-border/30 bg-primary/[0.03] flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/10 group">
                                    <Bot className="h-4 w-4 text-primary group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xs tracking-tight leading-none mb-0.5">
                                        {t("title")}
                                    </h3>
                                    <div className="flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[8px] uppercase tracking-[0.15em] font-black text-muted-foreground/60">
                                            {t("status")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="h-7 w-7 rounded-md hover:bg-primary/10 text-muted-foreground"
                                aria-label={t("minimize")}
                            >
                                <Minimize2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        {/* Message Feed */}
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar flex flex-col gap-3">
                            {messages.map((message, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: message.role === "user" ? 10 : -10, y: 5 }}
                                    animate={{ opacity: 1, x: 0, y: 0 }}
                                    className={cn(
                                        "flex flex-col max-w-[88%]",
                                        message.role === "user" ? "ml-auto items-end" : "items-start"
                                    )}
                                >
                                    <div className={cn(
                                        "px-3 py-2 rounded-xl text-xs leading-relaxed shadow-sm",
                                        message.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-tr-none shadow-glow-primary/10"
                                            : "glass-morphic text-foreground rounded-tl-none border-white/5"
                                    )}>
                                        {message.content}
                                    </div>
                                    <span className="text-[8px] text-muted-foreground/50 mt-1 px-1 font-medium italic">
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </motion.div>
                            ))}
                            {mutation.isPending && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 text-muted-foreground"
                                >
                                    <div className="glass px-2.5 py-1 rounded-full flex items-center gap-2 border-primary/5">
                                        <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />
                                        <span className="text-[9px] font-bold tracking-tight opacity-60">ANALYZING...</span>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={scrollRef} />
                        </div>

                        {/* Compact Quick Queries */}
                        {messages.length === 1 && (
                            <div className="px-3 py-1.5 flex flex-wrap gap-1.5">
                                {predefinedQueries.map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSend(item.query)}
                                        className="text-[9px] font-black px-2.5 py-1.5 rounded-lg glass-card border-white/5 hover:bg-primary/10 hover:border-primary/20 transition-all active:scale-95 text-primary/60 hover:text-primary uppercase tracking-wider"
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Refined Input Bar */}
                        <div className="p-3 bg-background/40 backdrop-blur-md border-t border-border/20">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault()
                                    handleSend()
                                }}
                                className="relative group"
                            >
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={t("placeholder")}
                                    className="w-full bg-muted/20 border border-border/20 rounded-xl px-3 py-2.5 pr-10 text-[xs] focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all placeholder:text-muted-foreground/30 font-medium"
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={!input.trim() || mutation.isPending}
                                    className="absolute right-1 top-1 h-8 w-8 rounded-lg bg-primary/90 shadow-glow-primary/10 hover:scale-105 active:scale-95 transition-all"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                </Button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
