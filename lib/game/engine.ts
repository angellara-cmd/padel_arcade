import { GameAudio } from './audio'
import { ALIEN_COLORS, ALIEN_POINTS, ALIENS, GIRL, GIRL_PALETTE, makeSprite, SHIELD, UFO } from './sprites'

export const WIDTH = 600
export const HEIGHT = 720

export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover'
export interface HudState {
  status: GameStatus
  score: number
  hiScore: number
  level: number
  newRecord: boolean
}

type PowerKind = 'triple' | 'rapid' | 'life'
type InputKey = 'left' | 'right' | 'fire'

interface Alien { col: number; row: number; type: number; alive: boolean }
interface Ball { x: number; y: number; vx: number; vy: number; spin: number }
interface Bolt { x: number; y: number; vy: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
interface FloatText { x: number; y: number; text: string; life: number; color: string }
interface PowerUp { x: number; y: number; kind: PowerKind }
interface Cell { x: number; y: number; alive: boolean }
interface Star { x: number; y: number; s: number; phase: number }

const SCALE = 3
const COLS = 11
const ROWS = 5
const CELL_W = 44
const CELL_H = 38
const FORMATION_W = 36
const GROUND_Y = HEIGHT - 44
const PLAYER_W = 54
const PLAYER_H = 66
const PLAYER_Y = GROUND_Y - PLAYER_H
const PLAYER_SPEED = 320
const SHIELD_Y = PLAYER_Y - 90
const SHIELD_CELL = 6
const HI_KEY = 'padel-invaders-hi'

const POWER_INFO: Record<PowerKind, { label: string; color: string }> = {
  triple: { label: 'T', color: '#e4ff3a' },
  rapid: { label: 'R', color: '#22d3ee' },
  life: { label: '+', color: '#ff3d9a' },
}

export class PadelInvadersEngine {
  private ctx: CanvasRenderingContext2D
  private audio = new GameAudio()
  private raf = 0
  private last = 0
  private font: string

  private girl: HTMLCanvasElement
  private girlMini: HTMLCanvasElement
  private alienSprites: HTMLCanvasElement[][]
  private ufoSprite: HTMLCanvasElement
  private stars: Star[] = []

  private status: GameStatus = 'menu'
  private input: Record<InputKey, boolean> = { left: false, right: false, fire: false }
  private time = 0

  private score = 0
  private hiScore = 0
  private startHi = 0
  private lives = 3
  private level = 1

  private playerX = WIDTH / 2
  private cooldown = 0
  private swing = 0
  private invuln = 0
  private freeze = 0
  private shake = 0
  private triple = 0
  private rapid = 0

  private aliens: Alien[] = []
  private ox = 0
  private oy = 0
  private dirX = 1
  private frame = 0
  private marchT = 0
  private marchStep = 0
  private enemyFireT = 1

  private ufo: { x: number; dir: number; points: number } | null = null
  private ufoT = 18
  private ufoSoundT = 0

  private balls: Ball[] = []
  private bolts: Bolt[] = []
  private particles: Particle[] = []
  private texts: FloatText[] = []
  private powerUps: PowerUp[] = []
  private cells: Cell[] = []
  private banner: { text: string; sub: string; t: number } | null = null

  constructor(
    private canvas: HTMLCanvasElement,
    private onHud: (hud: HudState) => void,
    fontFamily: string,
  ) {
    this.ctx = canvas.getContext('2d')!
    this.font = fontFamily || 'monospace'
    this.girl = makeSprite(GIRL, GIRL_PALETTE, SCALE)
    this.girlMini = makeSprite(GIRL, GIRL_PALETTE, 1)
    this.alienSprites = ALIENS.map((frames, i) => frames.map((f) => makeSprite(f, { x: ALIEN_COLORS[i] }, SCALE)))
    this.ufoSprite = makeSprite(UFO, { x: '#e4ff3a' }, SCALE)
    for (let i = 0; i < 110; i++) {
      this.stars.push({ x: Math.random() * WIDTH, y: Math.random() * GROUND_Y, s: Math.random() < 0.15 ? 2 : 1, phase: Math.random() * Math.PI * 2 })
    }
    try {
      this.hiScore = Number(localStorage.getItem(HI_KEY)) || 0
    } catch {}
    this.resize()
    this.spawnWave()
    this.buildShields()
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    window.addEventListener('resize', this.resize)
    this.emit()
    this.raf = requestAnimationFrame(this.loop)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    window.removeEventListener('resize', this.resize)
  }

  setInput(key: InputKey, value: boolean) {
    this.input[key] = value
    if (value) this.audio.unlock()
  }

  setMuted(muted: boolean) {
    this.audio.muted = muted
  }

  start() {
    this.audio.unlock()
    this.score = 0
    this.lives = 3
    this.level = 1
    this.startHi = this.hiScore
    this.playerX = WIDTH / 2
    this.triple = 0
    this.rapid = 0
    this.invuln = 0
    this.freeze = 0
    this.balls = []
    this.bolts = []
    this.powerUps = []
    this.particles = []
    this.texts = []
    this.ufo = null
    this.ufoT = 15 + Math.random() * 10
    this.spawnWave()
    this.buildShields()
    this.banner = { text: 'NIVEL 1', sub: '¡A LA PISTA!', t: 1.6 }
    this.status = 'playing'
    this.emit()
  }

  togglePause() {
    if (this.status === 'playing') this.status = 'paused'
    else if (this.status === 'paused') this.status = 'playing'
    else return
    this.emit()
  }

  private emit() {
    this.onHud({
      status: this.status,
      score: this.score,
      hiScore: this.hiScore,
      level: this.level,
      newRecord: this.score > this.startHi && this.score > 0,
    })
  }

  private resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = WIDTH * dpr
    this.canvas.height = HEIGHT * dpr
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.ctx.imageSmoothingEnabled = false
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.setInput('left', true)
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.setInput('right', true)
    else if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') this.setInput('fire', true)
    else if (k === 'p' || k === 'P' || k === 'Escape') this.togglePause()
    else if (k === 'Enter' && (this.status === 'menu' || this.status === 'gameover')) this.start()
    else return
    if (k === ' ' || k.startsWith('Arrow')) e.preventDefault()
  }

  private onKeyUp = (e: KeyboardEvent) => {
    const k = e.key
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.input.left = false
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.input.right = false
    else if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') this.input.fire = false
  }

  private onBlur = () => {
    this.input = { left: false, right: false, fire: false }
    if (this.status === 'playing') {
      this.status = 'paused'
      this.emit()
    }
  }

  private spawnWave() {
    this.aliens = []
    for (let row = 0; row < ROWS; row++) {
      const type = row === 0 ? 0 : row < 3 ? 1 : 2
      for (let col = 0; col < COLS; col++) this.aliens.push({ col, row, type, alive: true })
    }
    this.ox = (WIDTH - ((COLS - 1) * CELL_W + FORMATION_W)) / 2
    this.oy = 80 + Math.min(this.level - 1, 6) * 14
    this.dirX = 1
    this.enemyFireT = 1.5
  }

  private buildShields() {
    this.cells = []
    const shieldW = SHIELD[0].length * SHIELD_CELL
    const gap = (WIDTH - shieldW * 4) / 5
    for (let s = 0; s < 4; s++) {
      const sx = gap + s * (shieldW + gap)
      SHIELD.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === 'x') this.cells.push({ x: sx + x * SHIELD_CELL, y: SHIELD_Y + y * SHIELD_CELL, alive: true })
        }
      })
    }
  }

  private alienRect(a: Alien) {
    const sprite = this.alienSprites[a.type][0]
    return {
      x: this.ox + a.col * CELL_W + (FORMATION_W - sprite.width) / 2,
      y: this.oy + a.row * CELL_H,
      w: sprite.width,
      h: sprite.height,
    }
  }

  private loop = (now: number) => {
    const dt = Math.min((now - (this.last || now)) / 1000, 1 / 30)
    this.last = now
    this.update(dt)
    this.draw()
    this.raf = requestAnimationFrame(this.loop)
  }

  private burst(x: number, y: number, color: string, count: number, speed = 160) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const v = speed * (0.3 + Math.random())
      const life = 0.4 + Math.random() * 0.5
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, color, size: Math.random() < 0.5 ? 3 : 2 })
    }
  }

  private addScore(points: number) {
    this.score += points
    if (this.score > this.hiScore) {
      this.hiScore = this.score
      try {
        localStorage.setItem(HI_KEY, String(this.hiScore))
      } catch {}
    }
  }

  private update(dt: number) {
    this.time += dt
    this.shake = Math.max(0, this.shake - dt)
    this.swing = Math.max(0, this.swing - dt)

    for (const p of this.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 200 * dt
      p.life -= dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)
    for (const t of this.texts) {
      t.y -= 30 * dt
      t.life -= dt
    }
    this.texts = this.texts.filter((t) => t.life > 0)

    if (this.status === 'menu') {
      this.marchT -= dt
      if (this.marchT <= 0) {
        this.frame ^= 1
        this.marchT = 0.5
      }
      return
    }
    if (this.status !== 'playing') return

    if (this.freeze > 0) {
      this.freeze -= dt
      if (this.freeze <= 0 && this.lives <= 0) {
        this.status = 'gameover'
        this.audio.gameOver()
        this.emit()
      }
      return
    }

    const dir = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0)
    this.playerX = Math.max(PLAYER_W / 2, Math.min(WIDTH - PLAYER_W / 2, this.playerX + dir * PLAYER_SPEED * dt))
    this.invuln = Math.max(0, this.invuln - dt)
    this.triple = Math.max(0, this.triple - dt)
    this.rapid = Math.max(0, this.rapid - dt)

    if (this.banner) {
      this.banner.t -= dt
      if (this.banner.t <= 0) this.banner = null
      return
    }

    this.cooldown -= dt
    const maxBalls = this.triple > 0 ? 9 : this.rapid > 0 ? 5 : 2
    if (this.input.fire && this.cooldown <= 0 && this.balls.length < maxBalls) this.fire()

    this.updateBalls(dt)
    this.updateAliens(dt)
    this.updateBolts(dt)
    this.updateUfo(dt)
    this.updatePowerUps(dt)

    if (this.aliens.every((a) => !a.alive) && this.lives > 0) {
      this.level++
      this.audio.levelUp()
      this.balls = []
      this.bolts = []
      this.spawnWave()
      this.buildShields()
      this.banner = { text: `NIVEL ${this.level}`, sub: '¡SIGUIENTE SET!', t: 1.8 }
      this.emit()
    }
  }

  private fire() {
    const x = this.playerX + 16
    const y = PLAYER_Y + 4
    const angles = this.triple > 0 ? [-140, 0, 140] : [0]
    for (const vx of angles) this.balls.push({ x, y, vx, vy: -540, spin: 0 })
    this.cooldown = this.rapid > 0 ? 0.13 : 0.3
    this.swing = 0.15
    this.audio.shoot()
  }

  private hitCells(x: number, y: number, radius: number) {
    for (const c of this.cells) {
      if (!c.alive) continue
      if (x + radius > c.x && x - radius < c.x + SHIELD_CELL && y + radius > c.y && y - radius < c.y + SHIELD_CELL) {
        c.alive = false
        for (const n of this.cells) {
          if (n.alive && Math.abs(n.x - c.x) <= SHIELD_CELL && Math.abs(n.y - c.y) <= SHIELD_CELL && Math.random() < 0.4) n.alive = false
        }
        this.burst(x, y, '#22d3ee', 5, 80)
        return true
      }
    }
    return false
  }

  private updateBalls(dt: number) {
    const remaining: Ball[] = []
    outer: for (const b of this.balls) {
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.spin += dt * 14
      if (b.y < 30 || b.x < -10 || b.x > WIDTH + 10) continue
      if (this.hitCells(b.x, b.y, 5)) continue

      for (const a of this.aliens) {
        if (!a.alive) continue
        const r = this.alienRect(a)
        if (b.x + 5 > r.x && b.x - 5 < r.x + r.w && b.y + 5 > r.y && b.y - 5 < r.y + r.h) {
          a.alive = false
          const pts = ALIEN_POINTS[a.type] * (1 + Math.floor((this.level - 1) / 3))
          this.addScore(pts)
          this.burst(r.x + r.w / 2, r.y + r.h / 2, ALIEN_COLORS[a.type], 16)
          this.audio.alienHit()
          if (Math.random() < 0.07) {
            const roll = Math.random()
            const kind: PowerKind = roll < 0.12 ? 'life' : roll < 0.56 ? 'triple' : 'rapid'
            this.powerUps.push({ x: r.x + r.w / 2, y: r.y + r.h, kind })
          }
          continue outer
        }
      }

      if (this.ufo && b.y < 80 && b.y > 40 && b.x > this.ufo.x && b.x < this.ufo.x + this.ufoSprite.width) {
        this.addScore(this.ufo.points)
        this.texts.push({ x: this.ufo.x + 24, y: 60, text: String(this.ufo.points), life: 1.2, color: '#e4ff3a' })
        this.burst(this.ufo.x + 24, 60, '#e4ff3a', 30, 220)
        this.audio.ufoHit()
        this.ufo = null
        continue
      }

      for (const bolt of this.bolts) {
        if (Math.abs(bolt.x - b.x) < 7 && Math.abs(bolt.y - b.y) < 12) {
          bolt.y = HEIGHT + 100
          this.burst(b.x, b.y, '#ffffff', 6, 90)
          continue outer
        }
      }
      remaining.push(b)
    }
    this.balls = remaining
  }

  private updateAliens(dt: number) {
    const alive = this.aliens.filter((a) => a.alive)
    if (alive.length === 0) return
    const frac = alive.length / (COLS * ROWS)
    const speed = 28 + this.level * 7 + (1 - frac) * 200
    this.ox += this.dirX * speed * dt

    let minX = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const a of alive) {
      const r = this.alienRect(a)
      minX = Math.min(minX, r.x)
      maxX = Math.max(maxX, r.x + r.w)
      maxY = Math.max(maxY, r.y + r.h)
    }
    if (maxX > WIDTH - 12 && this.dirX > 0) {
      this.ox -= maxX - (WIDTH - 12)
      this.dirX = -1
      this.oy += 16
    } else if (minX < 12 && this.dirX < 0) {
      this.ox += 12 - minX
      this.dirX = 1
      this.oy += 16
    }

    this.marchT -= dt
    if (this.marchT <= 0) {
      this.frame ^= 1
      this.marchT = 0.08 + frac * 0.5
      this.audio.march(this.marchStep++)
    }

    if (maxY >= SHIELD_Y) {
      for (const a of alive) {
        const r = this.alienRect(a)
        for (const c of this.cells) {
          if (c.alive && c.x + SHIELD_CELL > r.x && c.x < r.x + r.w && c.y + SHIELD_CELL > r.y && c.y < r.y + r.h) c.alive = false
        }
      }
    }
    if (maxY >= PLAYER_Y + 10) {
      this.lives = 0
      this.playerHit()
      return
    }

    this.enemyFireT -= dt
    if (this.enemyFireT <= 0 && this.bolts.length < 3 + this.level) {
      const bottoms = new Map<number, Alien>()
      for (const a of alive) {
        const cur = bottoms.get(a.col)
        if (!cur || a.row > cur.row) bottoms.set(a.col, a)
      }
      const shooters = [...bottoms.values()]
      const nearby = shooters.filter((a) => Math.abs(this.alienRect(a).x - this.playerX) < 80)
      const pool = nearby.length && Math.random() < 0.5 ? nearby : shooters
      const shooter = pool[Math.floor(Math.random() * pool.length)]
      const r = this.alienRect(shooter)
      this.bolts.push({ x: r.x + r.w / 2, y: r.y + r.h, vy: 190 + this.level * 18 })
      this.enemyFireT = Math.max(0.22, 1.05 - this.level * 0.08) * (0.5 + Math.random())
    }
  }

  private updateBolts(dt: number) {
    const left = this.playerX - PLAYER_W / 2 + 6
    const remaining: Bolt[] = []
    for (const bolt of this.bolts) {
      bolt.y += bolt.vy * dt
      if (bolt.y > GROUND_Y) {
        this.burst(bolt.x, GROUND_Y, '#ff5470', 4, 60)
        continue
      }
      if (this.hitCells(bolt.x, bolt.y + 6, 3)) continue
      if (this.invuln <= 0 && bolt.x > left && bolt.x < left + 27 && bolt.y + 12 > PLAYER_Y + 6 && bolt.y < PLAYER_Y + PLAYER_H) {
        this.playerHit()
        return
      }
      remaining.push(bolt)
    }
    this.bolts = remaining
  }

  private playerHit() {
    this.lives = Math.max(0, this.lives - 1)
    this.burst(this.playerX, PLAYER_Y + 30, '#ff3d9a', 40, 260)
    this.burst(this.playerX, PLAYER_Y + 30, '#e4ff3a', 20, 200)
    this.audio.playerHit()
    this.shake = 0.5
    this.freeze = this.lives <= 0 ? 1.4 : 1
    this.invuln = 2.5
    this.bolts = []
    this.balls = []
    this.triple = 0
    this.rapid = 0
  }

  private updateUfo(dt: number) {
    if (this.ufo) {
      this.ufo.x += this.ufo.dir * 110 * dt
      this.ufoSoundT -= dt
      if (this.ufoSoundT <= 0) {
        this.audio.ufo()
        this.ufoSoundT = 0.25
      }
      if (this.ufo.x < -60 || this.ufo.x > WIDTH + 60) this.ufo = null
      return
    }
    this.ufoT -= dt
    if (this.ufoT <= 0) {
      const dir = Math.random() < 0.5 ? 1 : -1
      this.ufo = { x: dir > 0 ? -48 : WIDTH, dir, points: [50, 100, 150, 300][Math.floor(Math.random() * 4)] }
      this.ufoT = 18 + Math.random() * 12
    }
  }

  private updatePowerUps(dt: number) {
    const remaining: PowerUp[] = []
    for (const p of this.powerUps) {
      p.y += 120 * dt
      if (p.y > GROUND_Y) continue
      if (Math.abs(p.x - this.playerX) < 30 && p.y > PLAYER_Y && p.y < PLAYER_Y + PLAYER_H) {
        this.audio.powerUp()
        const info = POWER_INFO[p.kind]
        if (p.kind === 'triple') this.triple = 10
        else if (p.kind === 'rapid') this.rapid = 10
        else this.lives = Math.min(5, this.lives + 1)
        const label = p.kind === 'triple' ? 'TRIPLE' : p.kind === 'rapid' ? 'RAPIDO' : '+1 VIDA'
        this.texts.push({ x: this.playerX, y: PLAYER_Y - 10, text: label, life: 1.2, color: info.color })
        this.burst(p.x, p.y, info.color, 14, 120)
        continue
      }
      remaining.push(p)
    }
    this.powerUps = remaining
  }

  private text(str: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left') {
    const ctx = this.ctx
    ctx.font = `${size}px ${this.font}`
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    ctx.fillStyle = color
    ctx.fillText(str, x, y)
  }

  private draw() {
    const ctx = this.ctx
    ctx.save()
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 12 * this.shake, (Math.random() - 0.5) * 12 * this.shake)

    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT)
    grad.addColorStop(0, '#05071a')
    grad.addColorStop(1, '#101a4a')
    ctx.fillStyle = grad
    ctx.fillRect(-10, -10, WIDTH + 20, HEIGHT + 20)

    for (const s of this.stars) {
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(this.time * 1.5 + s.phase))
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(s.x, s.y, s.s, s.s)
    }
    ctx.globalAlpha = 1

    this.drawCourt()

    ctx.fillStyle = 'rgba(34, 211, 238, 0.85)'
    for (const c of this.cells) if (c.alive) ctx.fillRect(c.x, c.y, SHIELD_CELL, SHIELD_CELL)

    for (const a of this.aliens) {
      if (!a.alive || this.status === 'menu') continue
      const r = this.alienRect(a)
      ctx.drawImage(this.alienSprites[a.type][this.frame], r.x, r.y, r.w, r.h)
    }

    if (this.ufo) ctx.drawImage(this.ufoSprite, this.ufo.x, 44)

    for (const p of this.powerUps) this.drawPowerUp(p)

    for (const bolt of this.bolts) {
      ctx.strokeStyle = '#ff5470'
      ctx.lineWidth = 3
      ctx.beginPath()
      const zig = Math.floor(this.time * 20) % 2 === 0 ? 3 : -3
      ctx.moveTo(bolt.x, bolt.y)
      ctx.lineTo(bolt.x + zig, bolt.y + 4)
      ctx.lineTo(bolt.x - zig, bolt.y + 8)
      ctx.lineTo(bolt.x, bolt.y + 12)
      ctx.stroke()
    }

    for (const b of this.balls) this.drawBall(b)

    if (this.status !== 'gameover' && !(this.freeze > 0) && !(this.invuln > 0 && Math.floor(this.time * 14) % 2 === 0)) {
      this.drawPlayer()
    }

    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max)
      ctx.fillStyle = p.color
      ctx.fillRect(p.x, p.y, p.size, p.size)
    }
    ctx.globalAlpha = 1

    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 2)
      this.text(t.text, t.x, t.y, 10, t.color, 'center')
    }
    ctx.globalAlpha = 1

    ctx.restore()

    this.drawHud()
    if (this.status === 'menu') this.drawMenuTable()
    if (this.banner && this.status === 'playing') {
      ctx.fillStyle = 'rgba(5, 7, 26, 0.6)'
      ctx.fillRect(0, HEIGHT / 2 - 60, WIDTH, 110)
      this.text(this.banner.text, WIDTH / 2, HEIGHT / 2 - 18, 28, '#e4ff3a', 'center')
      this.text(this.banner.sub, WIDTH / 2, HEIGHT / 2 + 24, 12, '#ff3d9a', 'center')
    }
  }

  private drawCourt() {
    const ctx = this.ctx
    ctx.fillStyle = '#1d4ed8'
    ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, GROUND_Y, WIDTH, 3)
    ctx.fillRect(WIDTH / 2 - 1, GROUND_Y, 3, HEIGHT - GROUND_Y)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    for (let x = 0; x < WIDTH; x += 50) ctx.fillRect(x, GROUND_Y - 160, 1, 160)
    ctx.fillRect(0, GROUND_Y - 160, WIDTH, 1)
  }

  private drawBall(b: Ball) {
    const ctx = this.ctx
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = 0.25 / i
      ctx.fillStyle = '#e4ff3a'
      ctx.beginPath()
      ctx.arc(b.x - b.vx * 0.015 * i, b.y + 9 * i, 6 - i, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 0.25
    ctx.beginPath()
    ctx.arc(b.x, b.y, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(b.spin)
    ctx.fillStyle = '#e4ff3a'
    ctx.beginPath()
    ctx.arc(0, 0, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(-7, 0, 5, -0.9, 0.9)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(7, 0, 5, Math.PI - 0.9, Math.PI + 0.9)
    ctx.stroke()
    ctx.restore()
  }

  private drawPlayer() {
    const ctx = this.ctx
    const left = this.playerX - PLAYER_W / 2
    if (this.triple > 0 || this.rapid > 0) {
      ctx.globalAlpha = 0.18 + 0.1 * Math.sin(this.time * 8)
      ctx.fillStyle = this.triple > 0 ? '#e4ff3a' : '#22d3ee'
      ctx.beginPath()
      ctx.ellipse(this.playerX, PLAYER_Y + 36, 40, 42, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.drawImage(this.girl, left, PLAYER_Y)
    if (this.swing > 0) {
      ctx.globalAlpha = this.swing / 0.15
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(left + 43, PLAYER_Y + 14, 22, -Math.PI * 0.95, -Math.PI * 0.15)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  private drawPowerUp(p: PowerUp) {
    const ctx = this.ctx
    const info = POWER_INFO[p.kind]
    const pulse = 1 + 0.12 * Math.sin(this.time * 10)
    ctx.globalAlpha = 0.3
    ctx.fillStyle = info.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, 14 * pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#05071a'
    ctx.strokeStyle = info.color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    this.text(info.label, p.x + 1, p.y + 1, 10, info.color, 'center')
  }

  private drawHud() {
    const ctx = this.ctx
    this.text('PUNTOS', 16, 16, 9, '#ff3d9a')
    this.text(String(this.score).padStart(6, '0'), 16, 32, 12, '#ffffff')
    this.text('RECORD', WIDTH / 2, 16, 9, '#ff3d9a', 'center')
    this.text(String(this.hiScore).padStart(6, '0'), WIDTH / 2, 32, 12, '#ffffff', 'center')
    this.text('NIVEL', WIDTH - 16, 16, 9, '#ff3d9a', 'right')
    this.text(String(this.level), WIDTH - 16, 32, 12, '#ffffff', 'right')

    const by = GROUND_Y + 22
    this.text(String(this.lives), 16, by, 12, '#ffffff')
    for (let i = 0; i < Math.min(this.lives, 5); i++) ctx.drawImage(this.girlMini, 38 + i * 26, by - 16, 27, 33)

    let x = WIDTH - 16
    if (this.rapid > 0) {
      this.text(`R ${Math.ceil(this.rapid)}`, x, by, 10, '#22d3ee', 'right')
      x -= 70
    }
    if (this.triple > 0) this.text(`T ${Math.ceil(this.triple)}`, x, by, 10, '#e4ff3a', 'right')
  }

  private drawMenuTable() {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(5, 7, 26, 0.78)'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    const rows: [HTMLCanvasElement, string, string][] = [
      [this.ufoSprite, '= ? PUNTOS', '#e4ff3a'],
      [this.alienSprites[0][this.frame], '= 30 PUNTOS', ALIEN_COLORS[0]],
      [this.alienSprites[1][this.frame], '= 20 PUNTOS', ALIEN_COLORS[1]],
      [this.alienSprites[2][this.frame], '= 10 PUNTOS', ALIEN_COLORS[2]],
    ]
    const startY = 300
    rows.forEach(([sprite, label, color], i) => {
      const y = startY + i * 44
      ctx.drawImage(sprite, 190 - sprite.width / 2, y - sprite.height / 2)
      this.text(label, 240, y, 12, color)
    })
    const py = startY + rows.length * 44 + 10
    ;(['triple', 'rapid', 'life'] as PowerKind[]).forEach((kind, i) => {
      const x = 150 + i * 150
      this.drawPowerUp({ x, y: py, kind })
      const label = kind === 'triple' ? 'TRIPLE' : kind === 'rapid' ? 'RAPIDO' : 'VIDA'
      this.text(label, x, py + 26, 8, POWER_INFO[kind].color, 'center')
    })
  }
}
