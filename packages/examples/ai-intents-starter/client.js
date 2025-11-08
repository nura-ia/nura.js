import { AiClient, UiDispatcher } from '@nurajs/client'

const client = new AiClient('/ai')
const dispatcher = new UiDispatcher()

dispatcher.register('ui.open', (_, hint) => {
  const modal = document.getElementById('ai-intent-modal')
  if (!modal) return
  modal.textContent = `Opening ${hint?.target ?? 'orders'}`
  modal.removeAttribute('hidden')
})

document.getElementById('ai-intent-trigger')?.addEventListener('click', async () => {
  const { id } = await client.createIntent({
    type: 'orders.create',
    payload: { id: `order-${Date.now()}` },
  })
  const result = await client.getIntentResult(id)
  dispatcher.dispatch(result)
})
