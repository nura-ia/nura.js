import { performance } from 'node:perf_hooks'

import { matchFuzzy } from '../src/fuzzy.js'

const inputs = [
  'abre menu pedidos',
  'delete order fifteen',
  'ok nora abre el menu',
  'open settings panel',
]
const candidates = ['abre menú órdenes', 'delete order fifteen', 'open settings panel']

const timings: number[] = []
const iterations = 1000

for (let i = 0; i < iterations; i++) {
  const sample = inputs[i % inputs.length]
  const start = performance.now()
  matchFuzzy(sample, candidates, { locale: i % 2 === 0 ? 'es' : 'en' })
  const end = performance.now()
  timings.push(end - start)
}

const total = timings.reduce((acc, t) => acc + t, 0)
const average = total / timings.length
const sorted = [...timings].sort((a, b) => a - b)
const p95 = sorted[Math.floor(sorted.length * 0.95)]

console.log(`iterations=${iterations}`)
console.log(`average_ms=${average.toFixed(4)}`)
console.log(`p95_ms=${p95.toFixed(4)}`)
