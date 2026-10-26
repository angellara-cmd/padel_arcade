'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { HEIGHT, PadelInvadersEngine, WIDTH, type HudState } from '@/lib/game/engine'
import { GameOverlay } from './game-overlay'
import { TouchControls } from './touch-controls'

export function PadelInvaders() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<PadelInvadersEngine | null>(null)
  const [hud, setHud] = useState<HudState>({ status: 'menu', score: 0, hiScore: 0, level: 1, newRecord: false })
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    const font = getComputedStyle(document.documentElement).getPropertyValue('--font-press-start').trim()
    const engine = new PadelInvadersEngine(canvasRef.current, setHud, font)
    engineRef.current = engine
    return () => engine.destroy()
  }, [])

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    engineRef.current?.setMuted(next)
  }

  const canPause = hud.status === 'playing' || hud.status === 'paused'

  return (
    <div className="flex w-full flex-col items-center gap-3 [--chrome:12rem] md:[--chrome:6rem]">
      <div
        className="flex w-full items-center justify-between"
        style={{ maxWidth: `min(${WIDTH}px, calc((100dvh - var(--chrome)) * ${WIDTH / HEIGHT}))` }}
      >
        <h1 className="font-pixel text-xs text-foreground sm:text-sm">
          <span className="text-primary">PADEL</span> <span className="text-accent">INVADERS</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Activar sonido' : 'Silenciar'}
            className="flex size-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-secondary"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => engineRef.current?.togglePause()}
            disabled={!canPause}
            aria-label={hud.status === 'paused' ? 'Reanudar' : 'Pausar'}
            className="flex size-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
          >
            {hud.status === 'paused' ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
        </div>
      </div>

      <div
        className="relative w-full overflow-hidden rounded-lg border-2 border-primary/60 shadow-[0_0_40px_-8px] shadow-primary/50"
        style={{
          aspectRatio: `${WIDTH} / ${HEIGHT}`,
          maxWidth: `min(${WIDTH}px, calc((100dvh - var(--chrome)) * ${WIDTH / HEIGHT}))`,
        }}
      >
        <canvas
          ref={canvasRef}
          className="block size-full [image-rendering:pixelated]"
          role="img"
          aria-label="Pantalla del juego Padel Invaders"
        />
        <GameOverlay hud={hud} onStart={() => engineRef.current?.start()} onResume={() => engineRef.current?.togglePause()} />
      </div>

      <TouchControls onInput={(key, value) => engineRef.current?.setInput(key, value)} />

      <p className="hidden font-pixel text-[10px] leading-relaxed text-muted-foreground md:block">
        {'← → MOVER · ESPACIO GOLPEAR · P PAUSA'}
      </p>
    </div>
  )
}
