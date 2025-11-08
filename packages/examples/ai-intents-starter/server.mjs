import express from 'express'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { registerType } from '@nurajs/intents'
import { buildRouter } from '@nurajs/transport-http'

registerType({
  type: 'orders.create',
  schema: {
    type: 'object',
    required: ['id', 'items'],
    properties: {
      id: { type: 'string' },
      items: { type: 'array', items: { type: 'string' } },
    },
    additionalProperties: false,
  },
  mapper: payload => ({ type: 'ui.open', payload, uiHint: { target: 'orderForm' } }),
})

export function createServer() {
  const app = express()
  const currentDir = dirname(fileURLToPath(import.meta.url))
  app.use(express.static(currentDir))
  app.use(buildRouter({
    limits: { body: '32kb' },
    rateLimit: { windowMs: 60_000, max: 30 },
  }))
  return app
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createServer()
  const port = process.env.PORT ? Number(process.env.PORT) : 4000
  app.listen(port, () => {
    console.log(`AI intents starter listening on http://localhost:${port}/index.html`)
  })
}
