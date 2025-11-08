import test from 'node:test'
import assert from 'node:assert/strict'

import {
  matchFuzzy,
  compareWakeWord,
  tokenizeAndScore,
  damerauLevenshteinSimilarity,
} from '../dist/index.js'

test('matchFuzzy matches accent variations', () => {
  const result = matchFuzzy('menú órdenes', ['menu ordenes'], { locale: 'es' })
  assert.ok(result)
  assert.equal(result.value, 'menu ordenes')
  assert.ok(result.score > 0.8)
})

test('matchFuzzy exact match yields score 1', () => {
  const result = matchFuzzy('open orders', ['open orders', 'close orders'], { locale: 'en' })
  assert.ok(result)
  assert.equal(result.value, 'open orders')
  assert.equal(result.score, 1)
})

test('matchFuzzy tolerates single substitution', () => {
  const result = matchFuzzy('pedids', ['pedidos'], { locale: 'es' })
  assert.ok(result)
  assert.equal(result.value, 'pedidos')
  assert.ok(result.score > 0.6)
})

test('matchFuzzy returns null when candidates empty', () => {
  assert.equal(matchFuzzy('hola', []), null)
})

test('matchFuzzy respects custom confidence threshold', () => {
  const result = matchFuzzy('hola', ['adios'], { minConfidence: 0.95 })
  assert.equal(result, null)
})

test('compareWakeWord detects alias inside phrase', () => {
  const result = compareWakeWord('ok nora abre el menu', { canonical: 'nura', aliases: ['nora'] }, { locale: 'es' })
  assert.ok(result)
  assert.equal(result.value, 'nora')
  assert.ok(result.score >= 0.78)
})

test('compareWakeWord returns null for unrelated text', () => {
  const result = compareWakeWord('hola mundo', { canonical: 'nura', aliases: ['nora'] }, { locale: 'es' })
  assert.equal(result, null)
})

test('compareWakeWord keeps high confidence for close alias', () => {
  const result = compareWakeWord('hola nira', { canonical: 'nura' }, { minConfidence: 0.9 })
  assert.ok(result)
  assert.equal(result.value, 'nura')
  assert.ok(result.score >= 0.9)
})

test('compareWakeWord handles trailing punctuation', () => {
  const result = compareWakeWord('hey nura!', { canonical: 'nura' }, { locale: 'en' })
  assert.ok(result)
  assert.equal(result.value.toLowerCase(), 'nura')
})

test('tokenizeAndScore emits entries with indexes', () => {
  const scores = tokenizeAndScore('abre menu pedidos', ['abre', 'menú', 'ordenes'], { locale: 'es' })
  const indexes = new Set(scores.map((s) => s.index))
  assert.ok(indexes.has(0))
  assert.ok(indexes.has(1))
  assert.ok(indexes.has(2))
})

test('tokenizeAndScore honours minimum confidence filter', () => {
  const scores = tokenizeAndScore('diagnostics', ['open', 'close'], { locale: 'en', minConfidence: 0.6 })
  assert.equal(scores.length, 0)
})

test('tokenizeAndScore limits candidates per token', () => {
  const scores = tokenizeAndScore('abre menu', ['abre', 'menú', 'ordenes', 'salir'], {
    locale: 'es',
    maxCandidates: 1,
  })
  const counts = scores.reduce((acc, item) => acc.set(item.index, (acc.get(item.index) ?? 0) + 1), new Map())
  assert.ok([...counts.values()].every((count) => count === 1))
})

test('tokenizeAndScore marks phonetic hits', () => {
  const scores = tokenizeAndScore('nora', ['nura'], { locale: 'es' })
  const phonetic = scores.find((s) => s.via === 'phonetic')
  assert.ok(phonetic)
  assert.equal(phonetic.candidate, 'nura')
})

test('damerauLevenshteinSimilarity identical strings', () => {
  const sim = damerauLevenshteinSimilarity('orden', 'orden')
  assert.equal(sim, 1)
})

test('damerauLevenshteinSimilarity penalizes edits', () => {
  const sim = damerauLevenshteinSimilarity('orden', 'orend')
  assert.ok(sim >= 0.5)
  assert.ok(sim < 1)
})

test('matchFuzzy prefers canonical over distant candidate', () => {
  const result = matchFuzzy('configuracion', ['configuración', 'cerrar panel'], { locale: 'es' })
  assert.ok(result)
  assert.equal(result.value, 'configuración')
})

test('compareWakeWord chooses strongest alias', () => {
  const result = compareWakeWord('oye lura por favor', { canonical: 'nura', aliases: ['nora', 'lura'] }, { locale: 'es' })
  assert.ok(result)
  assert.equal(result.value, 'lura')
})

test('tokenizeAndScore handles case differences', () => {
  const scores = tokenizeAndScore('Open menu', ['open', 'menu'], { locale: 'en' })
  const exactMatches = scores.filter((s) => s.score === 1)
  assert.equal(exactMatches.length, 2)
})

test('matchFuzzy case-insensitive comparison', () => {
  const result = matchFuzzy('OPEN PANEL', ['open panel'], { locale: 'en' })
  assert.ok(result)
  assert.equal(result.value, 'open panel')
})

test('tokenizeAndScore returns edit matches when no exact candidate', () => {
  const scores = tokenizeAndScore('pedidos', ['ordenes'], { locale: 'es' })
  assert.ok(scores.some((s) => s.via === 'edit'))
})

test('matchFuzzy returns null for very distant words', () => {
  const result = matchFuzzy('abrir', ['cerrar'], { locale: 'es', minConfidence: 0.8 })
  assert.equal(result, null)
})

