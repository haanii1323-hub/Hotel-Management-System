'use client'

import React, { useState, useEffect } from 'react'
import { motion, Transition } from 'framer-motion'

export type TextRollProps = {
  children: string
  duration?: number
  getEnterDelay?: (index: number) => number
  getExitDelay?: (index: number) => number
  className?: string
  style?: React.CSSProperties
  transition?: Transition
  variants?: {
    enter: {
      initial: Record<string, any>
      animate: Record<string, any>
    }
    exit: {
      initial: Record<string, any>
      animate: Record<string, any>
    }
  }
  onAnimationComplete?: () => void
  hover?: boolean
  autoPlay?: boolean
  interval?: number
}

const defaultTransition: Transition = {
  ease: [0.16, 1, 0.3, 1],
  duration: 0.5,
}

const defaultVariants = {
  enter: {
    initial: { y: '0%' },
    animate: { y: '-100%' },
  },
  exit: {
    initial: { y: '100%' },
    animate: { y: '0%' },
  },
}

export function TextRoll({
  children,
  duration = 0.5,
  getEnterDelay = (index) => index * 0.03,
  getExitDelay = (index) => index * 0.03 + 0.02,
  className = '',
  style,
  transition = defaultTransition,
  variants = defaultVariants,
  onAnimationComplete,
  hover = true,
  autoPlay = false,
  interval = 4000,
}: TextRollProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isRolling, setIsRolling] = useState(false)

  // Split text into words and characters to support natural responsive word wrapping
  const words = typeof children === 'string' ? children.split(' ') : ['']

  useEffect(() => {
    if (!autoPlay) return

    const timer = setInterval(() => {
      setIsRolling((prev) => !prev)
    }, interval)

    return () => clearInterval(timer)
  }, [autoPlay, interval])

  const active = hover ? isHovered || isRolling : isRolling

  let globalCharIndex = 0

  return (
    <span
      className={`inline-flex flex-wrap overflow-hidden select-none cursor-pointer ${className}`}
      style={{
        lineHeight: 1.18,
        verticalAlign: 'baseline',
        ...style,
      }}
      onMouseEnter={() => hover && setIsHovered(true)}
      onMouseLeave={() => hover && setIsHovered(false)}
      onClick={() => setIsRolling((prev) => !prev)}
    >
      {words.map((word, wordIndex) => {
        const letters = word.split('')
        return (
          <span
            key={wordIndex}
            className="inline-flex whitespace-nowrap"
            style={{ marginRight: wordIndex < words.length - 1 ? '0.28em' : 0 }}
          >
            {letters.map((letter, letterIndex) => {
              const charIdx = globalCharIndex++
              return (
                <span
                  key={letterIndex}
                  className="relative inline-block overflow-hidden"
                  style={{
                    height: '1.22em',
                    verticalAlign: 'top',
                  }}
                >
                  {/* Top Character (Slides UP out of view) */}
                  <motion.span
                    className="inline-block"
                    initial={variants.enter.initial}
                    animate={active ? variants.enter.animate : variants.enter.initial}
                    transition={{
                      ...transition,
                      duration,
                      delay: getEnterDelay(charIdx),
                    }}
                    onAnimationComplete={
                      charIdx === children.length - 1 ? onAnimationComplete : undefined
                    }
                  >
                    {letter}
                  </motion.span>

                  {/* Bottom Character (Slides UP into view from below) */}
                  <motion.span
                    className="absolute left-0 top-0 inline-block"
                    aria-hidden="true"
                    initial={variants.exit.initial}
                    animate={active ? variants.exit.animate : variants.exit.initial}
                    transition={{
                      ...transition,
                      duration,
                      delay: getExitDelay(charIdx),
                    }}
                  >
                    {letter}
                  </motion.span>
                </span>
              )
            })}
          </span>
        )
      })}
    </span>
  )
}

export function TextRollBasic() {
  return (
    <TextRoll className="text-4xl text-black dark:text-white">
      motion-primitives
    </TextRoll>
  )
}

export default TextRoll
