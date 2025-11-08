import { stripWake } from '@nura/core/wake'
import { ContextManager } from '@nura/core/context'
import { detectLocale } from '@nura/core/locale'
import { parseNumeral } from '@nura/core/numerals'
import { normalizeSynonyms } from '@nura/core/synonyms'
import {
  registerType,
  createIntent as createAiIntent,
  getIntentResult as getAiIntentResult,
} from '@nurajs/intents'

function log(title, value) {
  console.log(title, typeof value === 'string' ? value : JSON.stringify(value))
}

try {
  // 1) Wake (alias/fonético)
  const w1 = stripWake('ok nora abre el menú de órdenes', {
    aliases: ['nora', 'lura', 'nula'],
    minConfidence: 0.7
  })
  const w2 = stripWake('okey nuera delete order fifteen', {
    aliases: ['nora', 'lura', 'nula'],
    minConfidence: 0.7
  })
  log('[wake 1]', w1) // debe empezar con "abre…"
  log('[wake 2]', w2) // debe empezar con "delete…"

  // 2) Locale
  const l1 = detectLocale('delete order fifteen', ['es', 'en'])
  const l2 = detectLocale('abre menú', ['es', 'en'])
  log('[locale]', `${l1} ${l2}`) // "en es"

  // 3) Numerales
  log('[numeral es]', parseNumeral('quince', 'es')) // 15
  log('[numeral en]', parseNumeral('fifteen', 'en')) // 15

  // 4) Sinónimos (ES)
  log('[synonyms es]', normalizeSynonyms('abre el menú de pedidos', 'es')) // "... menú de ordenes"

  // 5) Contexto (confirmación)
  const ctx = new ContextManager()
  ctx.save({ type: 'delete', target: 'order', payload: { id: 15 } })
  log('[context yes]', !!ctx.maybeConfirm('sí, elimínala')) // true
  log('[context noop]', !!ctx.maybeConfirm('no gracias'))   // false

  // 6) AI intents bridge
  registerType({
    type: 'smoke.echo',
    schema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
      additionalProperties: false,
    },
    mapper: payload => ({ type: 'ui.toast', payload, uiHint: { variant: 'info' } }),
  })

  const intent = await createAiIntent({ type: 'smoke.echo', payload: { text: 'hello-intent' } })
  log('[intent create]', intent.status)
  const uiResult = await getAiIntentResult(intent.id ?? intent.intentId)
  log('[intent result]', uiResult.type)

  console.log('✅ Smoke OK')
} catch (e) {
  console.error('❌ Smoke FAILED:', e?.stack || e)
  process.exit(1)
}
