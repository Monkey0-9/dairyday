"use client"

import dynamic from "next/dynamic"

const AIAssistantLoader = dynamic(
  () => import("./ai-assistant").then((mod) => ({ default: mod.AIAssistant })),
  {
    ssr: false,
    loading: () => <div className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-primary/20 animate-pulse border border-primary/40 backdrop-blur-md" />,
  }
)

export const LazyAIAssistant = () => {
  return <AIAssistantLoader />
}
