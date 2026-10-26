import type { HudState } from '@/lib/game/engine'

interface GameOverlayProps {
  hud: HudState
  onStart: () => void
  onResume: () => void
}

const buttonClass =
  'font-pixel rounded-md bg-primary px-6 py-4 text-xs text-primary-foreground shadow-[0_6px_0_0] shadow-primary/40 transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-none sm:text-sm'

export function GameOverlay({ hud, onStart, onResume }: GameOverlayProps) {
  if (hud.status === 'playing') return null

  if (hud.status === 'menu') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-between px-4 pb-[12%] pt-[12%] text-center">
        <div className="flex flex-col items-center gap-3">
          <p className="font-pixel text-3xl text-primary drop-shadow-[0_4px_0_rgba(0,0,0,0.6)] sm:text-5xl">PADEL</p>
          <p className="font-pixel text-2xl text-accent drop-shadow-[0_4px_0_rgba(0,0,0,0.6)] sm:text-4xl">INVADERS</p>
          <p className="mt-2 font-pixel text-[8px] leading-relaxed text-foreground sm:text-[10px]">
            {'¡LOS MARCIANOS HAN INVADIDO LA PISTA!'}
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <button type="button" onClick={onStart} className={buttonClass}>
            JUGAR
          </button>
          <p className="hidden animate-pulse font-pixel text-[10px] text-muted-foreground md:block">O PULSA ENTER</p>
        </div>
      </div>
    )
  }

  if (hud.status === 'paused') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background/75 backdrop-blur-sm">
        <p className="font-pixel text-2xl text-accent sm:text-3xl">PAUSA</p>
        <button type="button" onClick={onResume} className={buttonClass}>
          CONTINUAR
        </button>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background/80 px-4 text-center backdrop-blur-sm">
      <p className="font-pixel text-xl leading-relaxed text-primary sm:text-3xl">
        FIN DEL
        <br />
        PARTIDO
      </p>
      <dl className="flex flex-col gap-3 font-pixel text-xs sm:text-sm">
        <div className="flex gap-3">
          <dt className="text-muted-foreground">PUNTOS</dt>
          <dd className="text-foreground">{hud.score}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="text-muted-foreground">NIVEL</dt>
          <dd className="text-foreground">{hud.level}</dd>
        </div>
      </dl>
      {hud.newRecord && <p className="animate-pulse font-pixel text-xs text-accent sm:text-sm">{'¡NUEVO RECORD!'}</p>}
      <button type="button" onClick={onStart} className={buttonClass}>
        REVANCHA
      </button>
    </div>
  )
}
