import {
  registerType,
  createIntent as createAiIntent,
  getIntentResult as getAiIntentResult,
} from '@nura-js/intents'

function log(title, value) {
  console.log(title, typeof value === 'string' ? value : JSON.stringify(value))
}

try {
  // AI intents bridge
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
