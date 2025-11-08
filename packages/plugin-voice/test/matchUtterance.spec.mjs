import test from 'node:test'
import assert from 'node:assert/strict'

import { deriveIntentsFromSpecs, matchUtterance } from '../dist/index.js'

function createCtx(locale = 'es') {
  return {
    registry: {
      i18n: {
        getLocale: () => locale,
      },
      lexicon: {
        normalize: () => undefined,
        register: () => {},
        bulk: () => {},
        registerPhonetic: () => {},
        lookupPhonetic: () => null,
      },
      telemetry: {
        emit: () => {},
      },
      actions: {
        listSpecs: () => [],
      },
    },
  }
}

test('matchUtterance ranks phonetic wake phrase with entity mapping', () => {
  const ctx = createCtx('es')
  const spec = {
    name: 'open::menu:orders',
    type: 'open',
    phrases: {
      es: {
        canonical: ['abre menú órdenes {orderId}'],
        synonyms: ['abre menu pedidos {orderId}'],
      },
    },
    entities: [
      {
        name: 'orderId',
        type: 'number',
      },
    ],
    meta: {
      confidenceThreshold: 0.75,
    },
    aliases: {
      commands: [{ locale: 'es', variants: ['abre el menu pedidos {orderId}', 'abre el menu de pedidos {orderId}'] }],
      entities: { orderId: ['pedido'] },
    },
  }
  const intents = deriveIntentsFromSpecs([spec], ctx, 'es')
  const action = matchUtterance(
    ctx,
    'abre el menu de pedidos quince',
    intents,
    {
      fuzzy: true,
      wakeConfidence: 0.9,
      threshold: 0.7,
    },
  )
  assert.ok(action)
  assert.equal(action.type, 'open')
  assert.equal(action.meta?.via, 'phonetic')
  assert.equal(action.payload.orderId, 15)
  assert.equal(action.meta?.confidenceThreshold, 0.75)
})

test('matchUtterance respects per-intent threshold', () => {
  const ctx = createCtx('en')
  const spec = {
    name: 'delete::order',
    type: 'delete',
    phrases: {
      en: {
        canonical: ['delete order {orderId}'],
      },
    },
    entities: [
      {
        name: 'orderId',
        type: 'number',
      },
    ],
    meta: {
      confidenceThreshold: 0.9,
    },
    aliases: {
      entities: { orderId: ['ticket'] },
    },
  }
  const intents = deriveIntentsFromSpecs([spec], ctx, 'en')
  const result = matchUtterance(
    ctx,
    'delete ticket five',
    intents,
    {
      fuzzy: true,
      threshold: 0.7,
      wakeConfidence: 0.5,
    },
  )
  assert.equal(result, undefined)
})

