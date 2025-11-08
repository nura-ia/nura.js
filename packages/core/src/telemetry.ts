export type NTelemetryEvent = string

export type NTelemetryPayload = Record<string, unknown>

export type NTelemetryHandler = (payload: NTelemetryPayload) => void

export type NTelemetryWildcardHandler = (
  payload: NTelemetryPayload & { event: NTelemetryEvent },
) => void

export interface NTelemetry {
  on(event: '*', handler: NTelemetryWildcardHandler): void
  on(event: NTelemetryEvent, handler: NTelemetryHandler): void
  off(event: '*', handler: NTelemetryWildcardHandler): void
  off(event: NTelemetryEvent, handler: NTelemetryHandler): void
  emit(event: NTelemetryEvent, payload?: NTelemetryPayload): void
}

type InternalHandler = (payload: NTelemetryPayload | (NTelemetryPayload & { event: string })) => void

export function createTelemetry(): NTelemetry {
  const map = new Map<string | '*', Set<InternalHandler>>()

  function getHandlers(event: string | '*'): Set<InternalHandler> {
    if (!map.has(event)) {
      map.set(event, new Set())
    }

    return map.get(event) as Set<InternalHandler>
  }

  return {
    on(event, handler) {
      getHandlers(event).add(handler as InternalHandler)
    },
    off(event, handler) {
      getHandlers(event).delete(handler as InternalHandler)
    },
    emit(event, payload) {
      const normalized: NTelemetryPayload = payload ?? {}

      for (const handler of getHandlers(event)) {
        handler(normalized)
      }

      const wildcardPayload: NTelemetryPayload & { event: NTelemetryEvent } = {
        event,
        ...normalized,
      }

      for (const handler of getHandlers('*')) {
        handler(wildcardPayload)
      }
    },
  }
}
