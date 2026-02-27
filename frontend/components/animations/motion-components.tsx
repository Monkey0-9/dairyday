"use client"

import { motion, Variants } from "framer-motion"
import * as React from "react"

// Page transition wrapper
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// Fade in animation
export function FadeIn({ 
  children, 
  delay = 0,
  className 
}: { 
  children: React.ReactNode
  delay?: number
  className?: string 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay,
        ease: [0.22, 1, 0.36, 1] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Scale on tap animation wrapper
export function ScaleOnTap({ 
  children,
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Stagger container for lists
export function StaggerContainer({ 
  children,
  className,
  staggerDelay = 0.1
}: { 
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}) {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Stagger item for use inside StaggerContainer
export function StaggerItem({ 
  children,
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  }

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  )
}

// Slide in from side
export function SlideIn({ 
  children,
  direction = "left",
  delay = 0,
  className 
}: { 
  children: React.ReactNode
  direction?: "left" | "right" | "up" | "down"
  delay?: number
  className?: string 
}) {
  const directions = {
    left: { x: -50, y: 0 },
    right: { x: 50, y: 0 },
    up: { x: 0, y: -50 },
    down: { x: 0, y: 50 },
  }

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay,
        ease: [0.22, 1, 0.36, 1] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated number counter
export function AnimatedNumber({ 
  value,
  className 
}: { 
  value: number
  className?: string 
}) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {value}
    </motion.span>
  )
}

// Hover glow effect wrapper
export function HoverGlow({ 
  children,
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <motion.div
      whileHover={{ 
        boxShadow: "0 0 30px rgba(99, 102, 241, 0.3)",
      }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Pulse animation for live indicators
export function Pulse({ 
  children,
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <motion.div
      animate={{ 
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
      }}
      transition={{ 
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Skeleton shimmer animation
export function Shimmer({ className }: { className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ x: "-100%", opacity: 0 }}
      animate={{ x: "100%", opacity: [0, 1, 0] }}
      transition={{ 
        duration: 1.5,
        repeat: Infinity,
        ease: "linear",
      }}
      style={{
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
      }}
    />
  )
}
