export class GameAudio {
  private ctx: AudioContext | null = null
  muted = false

  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    if (this.muted || !this.ctx) return
    const t = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain).connect(this.ctx.destination)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  private noise(dur: number, vol: number, filterFreq: number) {
    if (this.muted || !this.ctx) return
    const t = this.ctx.currentTime
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = filterFreq
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(filter).connect(gain).connect(this.ctx.destination)
    src.start(t)
  }

  shoot() {
    this.tone(1100, 0.07, 'triangle', 0.25, 320)
    this.noise(0.03, 0.15, 4000)
  }
  alienHit() {
    this.noise(0.18, 0.25, 1800)
    this.tone(420, 0.15, 'square', 0.05, 90)
  }
  playerHit() {
    this.noise(0.6, 0.35, 700)
    this.tone(220, 0.6, 'sawtooth', 0.1, 40)
  }
  march(step: number) {
    this.tone([62, 55, 49, 44][step % 4], 0.09, 'square', 0.07)
  }
  ufo() {
    this.tone(880, 0.12, 'sine', 0.05, 660)
  }
  ufoHit() {
    ;[523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, 'square', 0.06, undefined, i * 0.07))
  }
  powerUp() {
    ;[660, 880, 1320].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.15, undefined, i * 0.06))
  }
  levelUp() {
    ;[392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.18, 'square', 0.06, undefined, i * 0.11))
  }
  gameOver() {
    ;[392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'square', 0.07, undefined, i * 0.22))
  }
}
