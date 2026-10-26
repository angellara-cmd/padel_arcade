export const GIRL = [
  '............rrrrr.',
  '...........rfffffr',
  '....hhhh...rfdfdfr',
  '...hwwwwh..rfffffr',
  '..hhssssh..rfdfdfr',
  '..hhesseh..rfffffr',
  '..h.hssh....rfffr.',
  '.....ss......rrr..',
  '.....ss.......g...',
  '...pppppp.....g...',
  '..pppppppp....s...',
  '.sppppppppsssss...',
  '.s.pppppp.........',
  '.s.pppppp.........',
  '...kkkkkk.........',
  '..kkkkkkkk........',
  '..kkkkkkkk........',
  '...ss..ss.........',
  '...ss..ss.........',
  '...ss..ss.........',
  '..ooo..ooo........',
  '..ooo..ooo........',
]

export const GIRL_PALETTE: Record<string, string> = {
  h: '#a0522d',
  w: '#ffffff',
  s: '#fcd5b4',
  e: '#1e1b4b',
  p: '#ff3d9a',
  k: '#f8fafc',
  o: '#e4ff3a',
  r: '#22d3ee',
  f: '#1e293b',
  d: '#64748b',
  g: '#f8fafc',
}

export const ALIENS: string[][][] = [
  [
    ['...xx...', '..xxxx..', '.xxxxxx.', 'xx.xx.xx', 'xxxxxxxx', '..x..x..', '.x.xx.x.', 'x.x..x.x'],
    ['...xx...', '..xxxx..', '.xxxxxx.', 'xx.xx.xx', 'xxxxxxxx', '..x..x..', '.x....x.', '..x..x..'],
  ],
  [
    ['..x.....x..', '...x...x...', '..xxxxxxx..', '.xx.xxx.xx.', 'xxxxxxxxxxx', 'x.xxxxxxx.x', 'x.x.....x.x', '...xx.xx...'],
    ['..x.....x..', 'x..x...x..x', 'x.xxxxxxx.x', 'xxx.xxx.xxx', 'xxxxxxxxxxx', '.xxxxxxxxx.', '..x.....x..', '.x.......x.'],
  ],
  [
    ['....xxxx....', '.xxxxxxxxxx.', 'xxxxxxxxxxxx', 'xxx..xx..xxx', 'xxxxxxxxxxxx', '...xx..xx...', '..xx.xx.xx..', 'xx........xx'],
    ['....xxxx....', '.xxxxxxxxxx.', 'xxxxxxxxxxxx', 'xxx..xx..xxx', 'xxxxxxxxxxxx', '..xxx..xxx..', '.xx..xx..xx.', '..xx....xx..'],
  ],
]

export const ALIEN_COLORS = ['#ff3d9a', '#22d3ee', '#ff9f1c']
export const ALIEN_POINTS = [30, 20, 10]

export const UFO = [
  '.....xxxxxx.....',
  '...xxxxxxxxxx...',
  '..xxxxxxxxxxxx..',
  '.xx.xx.xx.xx.xx.',
  'xxxxxxxxxxxxxxxx',
  '..xxx..xx..xxx..',
  '...x........x...',
]

export const SHIELD = [
  '..xxxxxxxx..',
  '.xxxxxxxxxx.',
  'xxxxxxxxxxxx',
  'xxxxxxxxxxxx',
  'xxxx....xxxx',
  'xxx......xxx',
]

export function makeSprite(rows: string[], palette: Record<string, string>, scale: number) {
  const width = Math.max(...rows.map((r) => r.length))
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = rows.length * scale
  const ctx = canvas.getContext('2d')!
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(x * scale, y * scale, scale, scale)
    }
  })
  return canvas
}
