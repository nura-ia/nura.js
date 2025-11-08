import test from 'node:test'
import assert from 'node:assert/strict'

import { stripWake } from '../dist/index.js'

test('stripWake removes wake words and filler tokens', () => {
  const result = stripWake('ok oye nura abre el menu principal', {
    value: 'nura',
    score: 0.92,
    strategy: 'hybrid',
    matchedTokens: [
      { token: 'nura', candidate: 'nura', score: 0.92, via: 'exact', index: 2 },
    ],
  })
  assert.equal(result, 'abre el menu principal')
})

test('stripWake trims multi-word wake phrases with punctuation', () => {
  const result = stripWake('Hey Nura, open the dashboard now', {
    value: 'hey nura',
    score: 0.88,
    strategy: 'hybrid',
    matchedTokens: [],
  })
  assert.equal(result, 'open the dashboard now')
})

test('stripWake falls back to trimmed input when nothing matches', () => {
  const result = stripWake('abre menu rapido', null)
  assert.equal(result, 'abre menu rapido')
})
