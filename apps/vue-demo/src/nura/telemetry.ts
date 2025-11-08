export type TelemetryEventRecord = {
  type: string
  data?: unknown
  timestamp: number
}

type TelemetryHandler = (event: TelemetryEventRecord) => void

const listeners = new Set<TelemetryHandler>()
const history: TelemetryEventRecord[] = []
const HISTORY_LIMIT = 200

export function emitTelemetry(type: string, data?: unknown): TelemetryEventRecord {
  const record: TelemetryEventRecord = {
    type,
    data,
    timestamp: Date.now(),
  }

  history.push(record)
  if (history.length > HISTORY_LIMIT) {
    history.splice(0, history.length - HISTORY_LIMIT)
  }

  listeners.forEach((handler) => {
    try {
      handler(record)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[nura][telemetry] handler error', error)
    }
  })

  return record
}

export function onTelemetry(handler: TelemetryHandler): () => void {
  listeners.add(handler)
  return () => {
    listeners.delete(handler)
  }
}

export function getTelemetryHistory(): TelemetryEventRecord[] {
  return [...history]
}
