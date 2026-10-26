'use client'

import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type InputKey = 'left' | 'right' | 'fire'

interface TouchControlsProps {
  onInput: (key: InputKey, value: boolean) => void
}

function HoldButton({ input, onInput, label, className, children }: {
  input: InputKey
  onInput: TouchControlsProps['onInput']
  label: string
  className: string
  children: ReactNode
}) {
  const release = () => onInput(input, false)
  return (
    <button
      type="button"
      aria-label={label}
      className={`flex touch-none select-none items-center justify-center rounded-xl active:scale-95 ${className}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        onInput(input, true)
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  )
}

export function TouchControls({ onInput }: TouchControlsProps) {
  return (
    <div className="flex w-full max-w-[600px] items-center justify-between gap-3 md:hidden">
      <div className="flex gap-3">
        <HoldButton input="left" label="Mover a la izquierda" onInput={onInput} className="size-16 border-2 border-border bg-secondary text-foreground">
          <ChevronLeft className="size-8" />
        </HoldButton>
        <HoldButton input="right" label="Mover a la derecha" onInput={onInput} className="size-16 border-2 border-border bg-secondary text-foreground">
          <ChevronRight className="size-8" />
        </HoldButton>
      </div>
      <HoldButton input="fire" label="Golpear bola" onInput={onInput} className="h-16 flex-1 max-w-44 bg-accent font-pixel text-xs text-accent-foreground">
        SMASH
      </HoldButton>
    </div>
  )
}
