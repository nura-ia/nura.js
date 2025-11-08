import { registry } from './demo-i18n'

registry.telemetry.on('*', (event) => {
  console.log('[TEL]', event)
})
