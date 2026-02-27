"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

type FontSize = "small" | "medium" | "large"

interface FontSizeContextType {
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined)

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>("medium")
  // In a real app, we might fetch this from the user profile or local storage
  // For now, we default to medium.

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("font-size-small", "font-size-medium", "font-size-large")
    root.classList.add(`font-size-${fontSize}`)

    // Apply actual scaling
    let scale = 100
    if (fontSize === "small") scale = 75
    if (fontSize === "large") scale = 135

    root.style.fontSize = `${scale}%`
  }, [fontSize])

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size)
    localStorage.setItem("dairy-font-size", size)
  }

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("dairy-font-size") as FontSize
    if (saved) {
      setFontSize(saved)
    }
  }, [])

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  )
}

export function useFontSize() {
  const context = useContext(FontSizeContext)
  if (context === undefined) {
    throw new Error("useFontSize must be used within a FontSizeProvider")
  }
  return context
}
