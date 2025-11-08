<template>
  <main class="demo">
    <section v-nu-listen.soft.scope="'ui'" class="workspace">
      <header class="hero">
        <h1>Nura MCP Demo</h1>
        <p>Conecta el gateway MCP, ejecuta intents y observa la telemetría en tiempo real.</p>
      </header>

      <section class="card">
        <header class="card__header">
          <h2>Gateway MCP</h2>
          <span :class="['status-pill', mcpConnected ? 'status-pill--ok' : '']">
            {{ mcpConnected ? 'Conectado ✅' : 'Desconectado' }}
          </span>
        </header>
        <label class="field" for="mcp-url">
          <span>Gateway WS URL</span>
          <input
            id="mcp-url"
            v-model="mcpUrl"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="wss://localhost:8787/mcp"
          />
        </label>
        <div class="actions-row">
          <button type="button" class="primary" @click="connectMcp">Conectar MCP</button>
          <button type="button" @click="listResources" :disabled="!mcpConnected">Listar resources</button>
          <button type="button" @click="listTools" :disabled="!mcpConnected">Listar tools</button>
        </div>
        <p v-if="statusMessage" class="status-message">{{ statusMessage }}</p>
        <div class="results">
          <div>
            <h3>Resources</h3>
            <pre>{{ formattedResources }}</pre>
          </div>
          <div>
            <h3>Tools</h3>
            <pre>{{ formattedTools }}</pre>
          </div>
        </div>
      </section>

      <section class="card">
        <header class="card__header">
          <h2>Intents de prueba</h2>
          <span class="hint">Los intents mapeados muestran <code>mcp.tool.called</code> en la telemetría.</span>
        </header>
        <div class="actions-row">
          <button
            v-nu-act="openAction"
            :aria-label="ariaLabel"
            class="primary"
            type="button"
          >
            Órdenes
          </button>
          <button type="button" class="secondary" @click="toggleLabel">
            Alternar label
          </button>
        </div>
        <form class="delete-form" @submit.prevent="runDelete">
          <label class="field-inline" for="order-id">
            <span>Orden a eliminar</span>
            <input
              id="order-id"
              v-model="deleteOrderId"
              type="number"
              min="1"
              required
            />
          </label>
          <button type="submit" class="danger" :disabled="deleteLoading">
            {{ deleteLoading ? 'Eliminando…' : 'Eliminar orden' }}
          </button>
        </form>
      </section>
    </section>

    <aside class="telemetry">
      <h2>Telemetría</h2>
      <p class="hint">Eventos recientes (máx. 200). Usa este panel para validar la integración.</p>
      <div class="log">
        <template v-if="telemetryRecords.length">
          <div
            v-for="(event, index) in telemetryRecords"
            :key="`${event.timestamp}-${event.type}-${index}`"
            :class="['log-entry', event.type.startsWith('mcp') ? 'log-entry--mcp' : '']"
          >
            <span class="log-entry__time">{{ formatTimestamp(event.timestamp) }}</span>
            <span class="log-entry__type">{{ event.type }}</span>
            <pre>{{ stringify(event.data) }}</pre>
          </div>
        </template>
        <p v-else class="empty">Sin eventos todavía.</p>
      </div>
    </aside>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { mcpConnect, mcpIsConnected, mcpListResources, mcpListTools } from './nura/mcp/client.js'
import { getTelemetryHistory, onTelemetry, type TelemetryEventRecord } from './nura/telemetry.js'

type Nullable<T> = T | null

const STORAGE_KEY = 'nura.mcp.url'
const hasWindow = typeof window !== 'undefined'
let storedUrl: string | null = null

if (hasWindow) {
  try {
    storedUrl = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    storedUrl = null
  }
}

const mcpUrl = ref(storedUrl ?? 'wss://localhost:8787/mcp')
const mcpConnected = ref(mcpIsConnected())
const mcpResources = ref<Nullable<any[]>>(null)
const mcpTools = ref<Nullable<any[]>>(null)
const statusMessage = ref<string>('')
const telemetryRecords = ref<TelemetryEventRecord[]>(getTelemetryHistory())
const deleteOrderId = ref('15')
const deleteLoading = ref(false)
let stopTelemetry: (() => void) | undefined

const openAction = {
  type: 'open',
  target: 'menu:orders',
  meta: { desc: 'Abrir menú de órdenes' },
} as const

const hasLabel = ref(true)
const ariaLabel = computed(() => (hasLabel.value ? 'Abrir menú de órdenes' : undefined))

watch(
  mcpUrl,
  (value) => {
    if (!hasWindow) return
    try {
      window.localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // ignore write failures (Safari private mode, etc.)
    }
  },
  { flush: 'post' },
)

onMounted(() => {
  stopTelemetry = onTelemetry((event) => {
    telemetryRecords.value = [...telemetryRecords.value.slice(-199), event]

    if (event.type === 'mcp.client.connected') {
      mcpConnected.value = true
      statusMessage.value = 'Conexión MCP establecida'
    } else if (event.type === 'mcp.client.disconnected') {
      mcpConnected.value = false
      statusMessage.value = 'MCP desconectado'
    } else if (event.type === 'mcp.client.error') {
      const message = typeof event.data === 'object' && event.data && 'message' in event.data
        ? String((event.data as Record<string, unknown>).message)
        : 'Error desconocido'
      statusMessage.value = `Error MCP: ${message}`
      mcpConnected.value = false
    } else if (event.type === 'mcp.tool.error') {
      const message = typeof event.data === 'object' && event.data && 'message' in event.data
        ? String((event.data as Record<string, unknown>).message)
        : 'Error desconocido'
      statusMessage.value = `Error al ejecutar tool: ${message}`
    }
  })
})

onBeforeUnmount(() => {
  stopTelemetry?.()
})

const formattedResources = computed(() =>
  mcpResources.value ? JSON.stringify(mcpResources.value, null, 2) : '—',
)
const formattedTools = computed(() =>
  mcpTools.value ? JSON.stringify(mcpTools.value, null, 2) : '—',
)

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

function stringify(value: unknown): string {
  if (value === undefined) return '—'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

async function connectMcp() {
  statusMessage.value = 'Conectando…'
  try {
    await mcpConnect({ kind: 'ws', url: mcpUrl.value.trim() })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    statusMessage.value = `No se pudo conectar: ${message}`
  }
}

async function listResources() {
  try {
    mcpResources.value = await mcpListResources()
    statusMessage.value = `Resources obtenidos (${mcpResources.value?.length ?? 0})`
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    statusMessage.value = `No se pudieron listar resources: ${message}`
  }
}

async function listTools() {
  try {
    mcpTools.value = await mcpListTools()
    statusMessage.value = `Tools obtenidos (${mcpTools.value?.length ?? 0})`
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    statusMessage.value = `No se pudieron listar tools: ${message}`
  }
}

function toggleLabel() {
  hasLabel.value = !hasLabel.value
}

async function runDelete() {
  const parsed = Number.parseInt(deleteOrderId.value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    statusMessage.value = 'Ingresa un ID de orden válido'
    return
  }

  if (!window.confirm(`¿Eliminar la orden ${parsed}?`)) {
    return
  }

  deleteLoading.value = true
  try {
    const result = await window.__nura?.act({
      type: 'delete',
      target: 'order',
      payload: { id: parsed },
      meta: { desc: `Eliminar orden ${parsed}` },
    })
    const via = result && typeof result === 'object' && 'via' in result ? (result as any).via : 'local'
    statusMessage.value = `Acción enviada vía ${via}`
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    statusMessage.value = `Error al eliminar la orden: ${message}`
  } finally {
    deleteLoading.value = false
  }
}
</script>

<style scoped>
.demo {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  gap: 2rem;
  padding: 2rem;
  background: radial-gradient(circle at top left, #4ade80, #2563eb);
  color: #0f172a;
  font-family: 'Inter', system-ui, sans-serif;
}

.workspace {
  display: grid;
  gap: 1.5rem;
  align-content: start;
}

.hero h1 {
  font-size: clamp(2rem, 3vw, 3rem);
  margin-bottom: 0.25rem;
}

.hero p {
  margin: 0;
  color: rgba(15, 23, 42, 0.75);
}

.card {
  background: rgba(255, 255, 255, 0.94);
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.3);
  display: grid;
  gap: 1rem;
}

.card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  background: rgba(148, 163, 184, 0.25);
  color: rgba(15, 23, 42, 0.85);
}

.status-pill--ok {
  background: rgba(34, 197, 94, 0.2);
  color: #166534;
}

.field {
  display: grid;
  gap: 0.5rem;
}

.field-inline {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.95rem;
}

.field span {
  font-weight: 600;
}

input[type='text'],
input[type='number'] {
  font: inherit;
  padding: 0.6rem 0.8rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background: white;
  color: inherit;
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

button {
  font: inherit;
  padding: 0.65rem 1.25rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s ease;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

button.primary {
  background: #2563eb;
  color: white;
  box-shadow: 0 10px 25px rgba(37, 99, 235, 0.3);
}

button.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px rgba(37, 99, 235, 0.35);
}

button.secondary {
  background: transparent;
  color: #2563eb;
  border: 2px solid #2563eb;
}

button.danger {
  background: #ef4444;
  color: white;
  box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
}

.status-message {
  margin: 0;
  font-size: 0.95rem;
  color: #0f172a;
}

.results {
  display: grid;
  gap: 1rem;
}

.results pre {
  margin: 0;
  padding: 0.75rem;
  border-radius: 0.75rem;
  background: rgba(226, 232, 240, 0.55);
  max-height: 220px;
  overflow: auto;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.9rem;
}

.delete-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: end;
}

.hint {
  font-size: 0.85rem;
  color: rgba(15, 23, 42, 0.65);
}

.telemetry {
  background: rgba(15, 23, 42, 0.8);
  color: #f8fafc;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.4);
  display: grid;
  gap: 1rem;
  max-height: calc(100vh - 4rem);
  overflow: hidden;
}

.telemetry h2 {
  margin: 0;
}

.telemetry .hint {
  color: rgba(226, 232, 240, 0.75);
}

.log {
  background: rgba(15, 23, 42, 0.5);
  border-radius: 0.75rem;
  padding: 1rem;
  overflow: auto;
}

.log-entry {
  display: grid;
  gap: 0.35rem;
  padding: 0.75rem;
  border-radius: 0.75rem;
  background: rgba(15, 23, 42, 0.45);
  margin-bottom: 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.log-entry--mcp {
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(37, 99, 235, 0.25);
}

.log-entry__time {
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.75);
}

.log-entry__type {
  font-weight: 600;
}

.log-entry pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.85rem;
  background: rgba(15, 23, 42, 0.6);
  padding: 0.5rem;
  border-radius: 0.5rem;
}

.empty {
  color: rgba(226, 232, 240, 0.75);
  text-align: center;
}

@media (max-width: 1024px) {
  .demo {
    grid-template-columns: 1fr;
  }

  .telemetry {
    max-height: none;
  }
}
</style>
