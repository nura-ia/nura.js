<template>
  <div class="nlx-panel" role="dialog" aria-label="Lexicon Studio">
    <header class="nlx-header">
      <strong>{{ title }}</strong>
      <div class="nlx-actions">
        <label class="sr-only" for="nlx-locale">Locale</label>
        <select id="nlx-locale" v-model="locale">
          <option v-for="l in locales" :key="l" :value="l">{{ l }}</option>
        </select>
        <button @click="doExport" :disabled="busy">Export</button>
        <label class="nlx-import">
          Import
          <input
            type="file"
            accept="application/json"
            @change="doImport"
            :disabled="busy"
          />
        </label>
      </div>
    </header>

    <section class="nlx-grid">
      <div class="nlx-col">
        <h3>Sinónimos ({{ rows.length }})</h3>
        <table class="nlx-table" role="table" aria-label="Lexicon terms">
          <thead>
            <tr>
              <th>Term</th>
              <th>Canonical</th>
              <th v-if="!readOnly">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in rows" :key="r.term + ':' + i">
              <td>
                <input :readonly="readOnly" v-model="rows[i].term" aria-label="Term" />
              </td>
              <td>
                <input
                  :readonly="readOnly"
                  v-model="rows[i].canonical"
                  aria-label="Canonical"
                />
              </td>
              <td v-if="!readOnly">
                <button @click="save(rows[i])">💾</button>
                <button @click="remove(rows[i])">🗑️</button>
              </td>
            </tr>
            <tr v-if="!readOnly">
              <td><input v-model="draft.term" placeholder="nuevo término" aria-label="Nuevo término" /></td>
              <td><input v-model="draft.canonical" placeholder="canonical" aria-label="Canonical nuevo" /></td>
              <td><button @click="add">➕</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="nlx-col">
        <h3>Probar utterance</h3>
        <div class="nlx-probe">
          <label class="sr-only" for="utt">Utterance</label>
          <input id="utt" v-model="utter" placeholder="ej: borra el ticket 15" />
          <div class="nlx-probe-actions">
            <button @click="probe" :disabled="busy">Probar</button>
            <label><input type="checkbox" v-model="withWake" /> Incluir wake word</label>
          </div>
          <div class="nlx-result" v-if="result">
            <p><b>Locale:</b> {{ result.locale }}</p>
            <p><b>Normalizado:</b> {{ result.norm }}</p>
            <p>
              <b>Intent ganador:</b>
              {{ result.best?.name ?? '—' }}
              (score {{ result.best?.score?.toFixed(3) ?? '—' }})
            </p>
            <p><b>Payload:</b> <code>{{ result.best?.payload ?? 'null' }}</code></p>
            <details v-if="result.candidates.length">
              <summary>Candidatos ({{ result.candidates.length }})</summary>
              <ul>
                <li v-for="c in result.candidates" :key="c.name + ':' + c.score">
                  {{ c.name }} — {{ c.score.toFixed(3) }}
                </li>
              </ul>
            </details>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type {
  LegacyNuraAction,
  ModernNAction,
  NAction,
  NContext,
  NLocale,
} from '@nura/core'
import { listTerms, setTerm, deleteTerm, importJson, exportJson, type LexRow } from './store'
import type { LexiconPanelOptions } from './index'
import { detectLocale, matchUtterance, deriveIntentsFromSpecs } from '@nura/plugin-voice'

interface ProbeCandidate {
  name: string
  score: number
}

interface ProbeBest {
  name: string
  payload: string
  score: number
}

interface ProbeResult {
  locale: string
  norm: string
  best: ProbeBest | null
  candidates: ProbeCandidate[]
}

const props = defineProps<{ ctx: NContext; opts?: LexiconPanelOptions }>()

const title = computed(() => props.opts?.title ?? 'Lexicon Studio')
const readOnly = computed(() => Boolean(props.opts?.readOnly))
const i18n = props.ctx.registry.i18n
const lex = props.ctx.registry.lexicon

const busy = ref(false)
const locales = computed(() => {
  const current = i18n.getLocale()
  const base = current.split('-')[0]
  const keys = new Set<string>([current, base, 'es', 'en'])
  Object.keys(lex.entries).forEach((key) => keys.add(key))
  return Array.from(keys).filter((k) => k)
})

const locale = ref<NLocale>((props.opts?.defaultLocale ?? i18n.getLocale()) as NLocale)
const rows = ref<LexRow[]>(listTerms(lex, locale.value))

watch(locale, (next) => {
  rows.value = listTerms(lex, next)
  draft.value = { term: '', canonical: '' }
})

const draft = ref<LexRow>({ term: '', canonical: '' })

function refreshRows() {
  rows.value = listTerms(lex, locale.value)
}

function add() {
  if (readOnly.value) return
  if (!draft.value.term || !draft.value.canonical) return
  setTerm(lex, locale.value, draft.value)
  refreshRows()
  draft.value = { term: '', canonical: '' }
}

function save(row: LexRow) {
  if (readOnly.value) return
  setTerm(lex, locale.value, row)
  refreshRows()
}

function remove(row: LexRow) {
  if (readOnly.value) return
  deleteTerm(lex, locale.value, row.term)
  refreshRows()
}

async function doImport(event: Event) {
  if (readOnly.value) return
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) return
  busy.value = true
  try {
    const text = await file.text()
    const json = JSON.parse(text) as Record<string, string>
    importJson(lex, locale.value, json)
    refreshRows()
  } finally {
    busy.value = false
    if (input) {
      input.value = ''
    }
  }
}

function doExport() {
  const data = exportJson(lex, locale.value)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `lexicon-${locale.value}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

const utter = ref('')
const withWake = ref(true)
const result = ref<ProbeResult | null>(null)

function probe() {
  const phrase = utter.value.trim()
  if (!phrase) return
  busy.value = true
  try {
    const previousLocale = i18n.getLocale()
    const text = withWake.value ? `ok nura ${phrase}` : phrase
    const candidateSet = new Set<NLocale>()
    candidateSet.add(previousLocale as NLocale)
    candidateSet.add(previousLocale.split('-')[0] as NLocale)
    candidateSet.add('es' as NLocale)
    candidateSet.add('en' as NLocale)
    const candidates = Array.from(candidateSet)
    const detected = detectLocale(text, candidates)
    i18n.setLocale(detected)

    const specs = (() => {
      try {
        return props.ctx.registry.actions.listSpecs()
      } catch {
        return []
      }
    })()
    const derived = deriveIntentsFromSpecs(specs, props.ctx, detected)
    const intents = derived
    const action = matchUtterance(props.ctx, text, intents, { fuzzy: true, threshold: 0.82 })

    result.value = {
      locale: detected,
      norm: text.toLowerCase(),
      best: toProbeBest(action),
      candidates: [],
    }

    if (detected !== previousLocale) {
      i18n.setLocale(previousLocale)
    }
  } finally {
    busy.value = false
  }
}

function toProbeBest(action: NAction | undefined): ProbeBest | null {
  if (!action) return null
  if (isModernAction(action)) {
    const name = `${action.type}${action.target ? `::${String(action.target)}` : ''}`
    return {
      name,
      payload: JSON.stringify(action.payload ?? null),
      score: 1,
    }
  }
  if (isLegacyAction(action)) {
    const name = `${action.verb}${action.scope ? `::${String(action.scope)}` : ''}`
    return {
      name,
      payload: JSON.stringify(action.metadata ?? null),
      score: 1,
    }
  }
  return null
}

function isModernAction(action: NAction): action is ModernNAction {
  return action != null && typeof action === 'object' && 'type' in action
}

function isLegacyAction(action: NAction): action is LegacyNuraAction {
  return action != null && typeof action === 'object' && 'verb' in action
}

onMounted(() => {
  const telemetry = props.ctx.registry.telemetry
  if (!telemetry || typeof telemetry.on !== 'function') return
  const handler = (payload: { candidates?: ProbeCandidate[] }) => {
    if (!result.value) return
    result.value = {
      ...result.value,
      candidates: payload.candidates ?? [],
    }
  }
  telemetry.on('voice.intent.candidates', handler)
  onUnmounted(() => {
    telemetry.off?.('voice.intent.candidates', handler)
  })
})
</script>

<style scoped>
.nlx-panel {
  position: relative;
  background: var(--nlx-bg, #0b1020);
  color: #e6edf3;
  border: 1px solid #2b3352;
  border-radius: 12px;
  padding: 12px;
  font: 14px/1.4 system-ui, sans-serif;
  max-width: 1100px;
}

.nlx-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.nlx-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.nlx-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.nlx-table {
  width: 100%;
  border-collapse: collapse;
}

.nlx-table th,
.nlx-table td {
  border-bottom: 1px solid #2b3352;
  padding: 6px;
}

.nlx-probe {
  display: grid;
  gap: 8px;
}

.nlx-probe-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.nlx-result code {
  background: #0e1628;
  padding: 2px 6px;
  border-radius: 6px;
}

.nlx-col h3 {
  margin: 4px 0 8px;
}

.nlx-import input[type='file'] {
  display: none;
}

.sr-only {
  position: absolute;
  left: -9999px;
}

@media (max-width: 900px) {
  .nlx-grid {
    grid-template-columns: 1fr;
  }
}
</style>
