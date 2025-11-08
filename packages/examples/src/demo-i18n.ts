import { Nura, createRegistry, defineActionSpec } from '@nura/core'
import type { NActionSpec } from '@nura/core'
import { seedLexicon } from '@nura/core'
import { voiceAgent } from '@nura/plugin-voice'

type DemoContext = Parameters<ReturnType<typeof voiceAgent>['start']>[0]

const specs: NActionSpec[] = [
  defineActionSpec({
    name: 'open_orders_menu',
    type: 'open',
    target: 'menu:orders',
    scope: 'ui',
    locale: 'es-CR',
    phrases: {
      'es-CR': {
        canonical: ['abre el menú de órdenes'],
        synonyms: ['abrir el menú de órdenes', 'mostrar órdenes'],
        labels: ['órdenes', 'menú'],
      },
      'en-US': {
        canonical: ['open orders menu'],
        synonyms: ['show orders', 'open the orders menu'],
        labels: ['orders', 'menu'],
      },
    },
  }),
  defineActionSpec({
    name: 'delete_order',
    type: 'delete',
    target: 'order',
    scope: 'orders',
    locale: 'es-CR',
    entities: [{ name: 'id', type: 'number' }],
    phrases: {
      'es-CR': {
        canonical: ['elimina la orden {id}'],
        synonyms: ['borra la orden {id}', 'eliminar orden {id}'],
        labels: ['orden', 'borrar'],
      },
      'en-US': {
        canonical: ['delete order {id}'],
        synonyms: ['remove order {id}'],
        labels: ['order', 'delete'],
      },
    },
    validate: (payload: unknown) =>
      typeof (payload as { id?: unknown } | undefined)?.id === 'number' &&
      (payload as { id: number }).id > 0,
  }),
  defineActionSpec({
    name: 'filter_orders_by_range',
    type: 'filter',
    target: 'order',
    scope: 'orders',
    locale: 'es-CR',
    entities: [{ name: 'range', type: 'range_number' }],
    phrases: {
      'es-CR': {
        canonical: ['filtra órdenes entre {range}'],
        synonyms: ['filtrar órdenes de {range}'],
      },
      'en-US': {
        canonical: ['filter orders between {range}'],
        synonyms: ['filter orders from {range}'],
      },
    },
    validate: (payload: unknown) => {
      const range = (payload as { range?: { min?: number; max?: number } } | undefined)?.range
      return range?.min != null && range?.max != null
    },
  }),
  defineActionSpec({
    name: 'set_dark_mode',
    type: 'set',
    target: 'ui:darkmode',
    scope: 'ui',
    locale: 'es-CR',
    entities: [{ name: 'enabled', type: 'boolean' }],
    phrases: {
      'es-CR': { canonical: ['activar modo oscuro {enabled}'] },
      'en-US': { canonical: ['enable dark mode {enabled}'] },
    },
    validate: (payload: unknown) =>
      typeof (payload as { enabled?: unknown } | undefined)?.enabled === 'boolean',
  }),
  defineActionSpec({
    name: 'schedule_report',
    type: 'create',
    target: 'report',
    scope: 'reports',
    locale: 'es-CR',
    entities: [
      { name: 'when', type: 'date' },
      { name: 'kind', type: 'enum', options: ['daily', 'weekly', 'monthly'] },
    ],
    phrases: {
      'es-CR': { canonical: ['programa reporte {when} {kind}'] },
      'en-US': { canonical: ['schedule report {when} {kind}'] },
    },
    validate: (payload: unknown) => (payload as { when?: unknown } | undefined)?.when instanceof Date,
  }),
]

export const registry = createRegistry({
  config: { app: { id: 'demo-i18n', locale: 'es-CR' } },
  routes: {
    'open::menu:orders': async () => ({ ok: true }),
    'delete::order': async (payload: unknown) => ({
      ok: true,
      message: `deleted ${(payload as { id?: unknown } | undefined)?.id ?? ''}`,
    }),
    'filter::order': async (payload: unknown) => ({ ok: true, message: JSON.stringify(payload) }),
    'set::ui:darkmode': async (payload: unknown) => ({
      ok: true,
      message: `darkmode ${String((payload as { enabled?: unknown } | undefined)?.enabled)}`,
    }),
    'create::report': async (payload: unknown) => ({
      ok: true,
      message: `scheduled ${(payload as { kind?: unknown } | undefined)?.kind ?? ''}`,
    }),
  },
  specs,
  seedLexicon,
  i18n: {
    bundles: {
      'es-CR': {
        common: { ok: 'Aceptar', cancel: 'Cancelar' },
        ui: { orders_menu: 'Menú de Órdenes' },
      },
      'en-US': {
        common: { ok: 'OK', cancel: 'Cancel' },
        ui: { orders_menu: 'Orders Menu' },
      },
    },
  },
})

const nura = new Nura({ registry })
const agent = voiceAgent({ wakeWords: ['ok nura'], language: 'es-CR', keyWake: 'F2' })

nura.start()

const runtimeRegistry = (nura as any)['#registry'] ?? registry

agent.start({
  registry: runtimeRegistry,
  i18n: runtimeRegistry.i18n,
  lexicon: runtimeRegistry.lexicon,
  act: (action: Parameters<Nura['act']>[0]) => nura.act(action),
  select: (selector: string) => Array.from(document.querySelectorAll(selector)),
  audit: { log: () => {} },
} as DemoContext)
