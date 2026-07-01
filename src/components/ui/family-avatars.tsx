import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface FamilyAvatarsProps {
  names: string[]
  className?: string
  size?: "sm" | "md" | "lg"
}

// Preset themed colors matching our Navy/Beige/Sage/Brown/Green palette
const COLOR_CLASSES = [
  "bg-primary text-primary-foreground", // Navy
  "bg-secondary text-secondary-foreground border-secondary/25", // Sage
  "bg-tertiary text-tertiary-foreground border-tertiary/25", // Brown
  "bg-chart-1 text-chart-1-foreground border-chart-1/25", // Orange/Rose
  "bg-chart-2 text-chart-2-foreground border-chart-2/25", // Green
  "bg-chart-3 text-chart-3-foreground border-chart-3/25", // Gold
]

const containerVariants = {
  initial: {},
  hover: {
    transition: {
      staggerChildren: 0.05
    }
  }
}

export function FamilyAvatars({ names, className, size = "md" }: FamilyAvatarsProps) {
  if (!names || names.length === 0) return null

  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
  }

  const marginClasses = {
    sm: "-ml-1.5 first:ml-0",
    md: "-ml-2.5 first:ml-0",
    lg: "-ml-3.5 first:ml-0",
  }

  const avatarVariants = {
    initial: { 
      marginLeft: marginClasses[size] === "-ml-2.5 first:ml-0" ? -10 : marginClasses[size] === "-ml-1.5 first:ml-0" ? -6 : -14,
      scale: 1,
      zIndex: 10
    },
    hover: (index: number) => ({
      marginLeft: index === 0 ? 0 : 6,
      scale: 1.1,
      zIndex: 20 + index,
      transition: { type: "spring" as const, stiffness: 300, damping: 18 }
    })
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      whileHover="hover"
      className={cn("flex items-center select-none relative py-1", className)}
    >
      {names.map((name, idx) => {
        const cleanName = name.trim()
        const initial = cleanName.charAt(0).toUpperCase()
        
        // Deterministic color assignment based on name string
        let hash = 0
        for (let i = 0; i < cleanName.length; i++) {
          hash = cleanName.charCodeAt(i) + ((hash << 5) - hash)
        }
        const colorIndex = Math.abs(hash) % COLOR_CLASSES.length
        const colorClass = COLOR_CLASSES[colorIndex]

        return (
          <motion.div
            key={idx}
            custom={idx}
            variants={avatarVariants}
            className={cn(
              "rounded-full border-2 border-background flex items-center justify-center font-extrabold shadow-sm relative group cursor-default shrink-0",
              sizeClasses[size],
              colorClass
            )}
            title={cleanName}
          >
            {initial}
            
            {/* Tooltip */}
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-popover border border-border text-[9px] font-bold text-popover-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              {cleanName}
            </span>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
