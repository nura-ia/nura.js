export type NActionMeta = {
  /** Si la acción requiere confirmación explícita del usuario */
  requireConfirm?: boolean
  /** Permisos o roles necesarios (genérico para no acoplar) */
  permissions?: string[] | string
  /** Hint de prioridad para ranking */
  priority?: 'soft' | 'normal' | 'hard'
  /** Descripción amigable utilizada en telemetría o interfaces */
  desc?: string
  /** Confianza calculada para la coincidencia actual */
  confidence?: number
  /** Origen del match utilizado por adaptadores de voz */
  via?: 'exact' | 'phonetic' | 'global'
  /** Hint del origen del wake word */
  wakeVia?: string
  /** Umbral sugerido para fuzzy matching */
  confidenceThreshold?: number
  /** Campos extra */
  [key: string]: unknown
}

/** Alias semántico para el meta de los specs de acción */
export type NActionSpecMeta = NActionMeta
