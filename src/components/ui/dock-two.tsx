import * as React from "react"
import { motion, useMotionValue, useSpring, useTransform, MotionValue } from "framer-motion"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface DockProps {
  className?: string
  items: {
    icon: LucideIcon
    label: string
    onClick?: () => void
    active?: boolean
  }[]
}

interface DockIconButtonProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  className?: string
  active?: boolean
  mouseX: MotionValue<number>
}

const DockIconButton = ({ icon: Icon, label, onClick, className, active, mouseX }: DockIconButtonProps) => {
  const ref = React.useRef<HTMLButtonElement>(null)

  // Calculate distance between mouse pointer X and this button center
  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - bounds.x - bounds.width / 2
  })

  // Map distance to width and height transformations
  const widthTransform = useTransform(distance, [-120, 0, 120], [46, 62, 46])
  const heightTransform = useTransform(distance, [-120, 0, 120], [46, 62, 46])
  const yTransform = useTransform(distance, [-120, 0, 120], [0, -8, 0])

  // Apply spring smoothing
  const springOptions = { mass: 0.1, stiffness: 200, damping: 15 }
  const width = useSpring(widthTransform, springOptions)
  const height = useSpring(heightTransform, springOptions)
  const y = useSpring(yTransform, springOptions)

  return (
    <motion.button
      ref={ref}
      style={{ width, height, y }}
      onClick={onClick}
      className={cn(
        "relative group rounded-xl transition-colors duration-150 flex flex-col items-center justify-center cursor-pointer shrink-0 select-none",
        active
          ? "bg-primary text-primary-foreground shadow-md"
          : "hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent hover:border-border/40",
        className
      )}
    >
      <Icon className="w-5 h-5" />
      
      {/* Tooltip on hover */}
      <span className={cn(
        "absolute -top-10 left-1/2 -translate-x-1/2",
        "px-2.5 py-1 rounded-md text-xs font-semibold shadow-md",
        "bg-popover text-popover-foreground border border-border",
        "opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100",
        "transition-all duration-200 ease-out whitespace-nowrap pointer-events-none z-[60]"
      )}>
        {label}
      </span>
      
      {/* Active dot indicator underneath */}
      {active && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary-foreground shadow-xs"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
    </motion.button>
  )
}

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  ({ items, className }, ref) => {
    const mouseX = useMotionValue(Infinity)

    return (
      <div 
        ref={ref} 
        className={cn("w-full flex items-center justify-center p-2 z-50", className)}
      >
        <div className="w-full max-w-4xl flex items-center justify-center relative">
          <motion.div
            onMouseMove={(e) => mouseX.set(e.pageX)}
            onMouseLeave={() => mouseX.set(Infinity)}
            className={cn(
              "flex items-end gap-2.5 p-2 rounded-2xl h-[76px]",
              "backdrop-blur-xl border shadow-2xl",
              "bg-background/80 border-border/60",
              "hover:shadow-3xl transition-shadow duration-300",
              "glass-card"
            )}
          >
            {items.map((item) => (
              <DockIconButton 
                key={item.label} 
                mouseX={mouseX} 
                {...item} 
              />
            ))}
          </motion.div>
        </div>
      </div>
    )
  }
)
Dock.displayName = "Dock"

export { Dock }
