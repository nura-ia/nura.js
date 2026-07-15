import assert from 'node:assert/strict'
import test from 'node:test'

import { DOMIndexer } from '../../.coverage-dist/indexer.js'
import {
  findElementsByScope,
  findElementsByVerb,
  scanDOM,
} from '../../.coverage-dist/scanner.js'
import {
  KNOWN_NURA_VERBS,
  parseVerbList,
  toNuraVerb,
} from '../../.coverage-dist/verbs.js'

class FakeElement {
  constructor({ id = '', attrs = {}, children = [], nodeType = 1 } = {}) {
    this.id = id
    this.attrs = { ...attrs }
    this.children = []
    this.nodeType = nodeType
    for (const child of children) this.append(child)
  }

  append(child) {
    this.children.push(child)
    return child
  }

  getAttribute(name) {
    return Object.hasOwn(this.attrs, name) ? this.attrs[name] : null
  }

  hasAttribute(name) {
    return Object.hasOwn(this.attrs, name)
  }

  contains(candidate) {
    return this === candidate || this.children.some((child) => child.contains(candidate))
  }

  querySelectorAll(selector) {
    const values = []
    const matches = (element) => {
      if (selector === '[data-nu-scope]') return element.hasAttribute('data-nu-scope')
      if (selector === '[data-nu-listen], [data-nu-act]') {
        return element.hasAttribute('data-nu-listen') || element.hasAttribute('data-nu-act')
      }
      throw new Error(`Unexpected selector: ${selector}`)
    }
    const walk = (element) => {
      for (const child of element.children) {
        if (matches(child)) values.push(child)
        walk(child)
      }
    }
    walk(this)
    return values
  }
}

class FakeMutationObserver {
  static instances = []
  constructor(callback) {
    this.callback = callback
    this.observed = null
    this.disconnected = false
    FakeMutationObserver.instances.push(this)
  }
  observe(root, options) {
    this.observed = { root, options }
  }
  disconnect() {
    this.disconnected = true
  }
  emit(mutations) {
    this.callback(mutations)
  }
}

test('verb parsing preserves the complete action vocabulary and normalizes unknown values', () => {
  assert.equal(KNOWN_NURA_VERBS.length, 17)
  assert.equal(toNuraVerb('open'), 'open')
  assert.equal(toNuraVerb('unknown'), 'custom')
  assert.deepEqual(parseVerbList(null), [])
  assert.deepEqual(parseVerbList('open, close  reset unknown'), ['open', 'close', 'reset', 'custom'])
})

test('DOM utilities are safe during SSR and no-op without a root', () => {
  const originalDocument = globalThis.document
  const originalObserver = globalThis.MutationObserver
  Reflect.deleteProperty(globalThis, 'document')
  Reflect.deleteProperty(globalThis, 'MutationObserver')
  try {
    assert.deepEqual(scanDOM().elements, [])
    assert.deepEqual(findElementsByScope('orders'), [])
    assert.deepEqual(findElementsByVerb('open'), [])
    const indexer = new DOMIndexer()
    assert.deepEqual(indexer.scan(), [])
    assert.deepEqual(indexer.getAll(), [])
    indexer.stopObserving()
    indexer.destroy()
  } finally {
    if (originalDocument !== undefined) globalThis.document = originalDocument
    if (originalObserver !== undefined) globalThis.MutationObserver = originalObserver
  }
})

test('indexer includes the root, keeps stable IDs, parses metadata, and removes stale entries', () => {
  const invalid = new FakeElement({
    attrs: {
      'data-nu-scope': 'invalid',
      'data-nu-listen': 'view',
      'data-nu-meta': '{',
    },
  })
  const arrayMetadata = new FakeElement({
    attrs: {
      'data-nu-scope': 'array',
      'data-nu-listen': 'view',
      'data-nu-meta': '[]',
    },
  })
  const noVerbs = new FakeElement({ attrs: { 'data-nu-scope': 'empty' } })
  const nullScope = new FakeElement({
    attrs: { 'data-nu-scope': null, 'data-nu-listen': 'open' },
  })
  const child = new FakeElement({
    attrs: {
      'data-nu-scope': 'orders',
      'data-nu-listen': 'open click reset increment filter set view hover open',
      'data-nu-act': 'navigate',
      'data-nu-meta': '{"safe":true}',
    },
  })
  const explicit = new FakeElement({
    id: 'explicit-id',
    attrs: { 'data-nu-scope': 'explicit', 'data-nu-act': 'close' },
  })
  const root = new FakeElement({
    attrs: { 'data-nu-scope': 'workspace', 'data-nu-act': 'navigate' },
    children: [child, explicit, invalid, arrayMetadata, noVerbs, nullScope],
  })

  const warnings = []
  const originalWarn = console.warn
  console.warn = (...args) => warnings.push(args)
  try {
    const indexer = new DOMIndexer({ root, observeChanges: false })
    const firstId = indexer.findByScope('orders')[0].id
    assert.equal(indexer.getAll().length, 5)
    assert.equal(indexer.findById('explicit-id').scope, 'explicit')
    assert.equal(indexer.findById('missing'), undefined)
    assert.equal(indexer.findByVerb('navigate').length, 2)
    assert.deepEqual(indexer.findByScope('orders')[0].metadata, { safe: true })
    assert.deepEqual(indexer.findByScope('array')[0].metadata, {})
    assert.equal(warnings.length, 1)

    indexer.scan()
    assert.equal(indexer.findByScope('orders')[0].id, firstId)

    child.attrs['data-nu-scope'] = 'orders-updated'
    indexer.scan(child)
    assert.equal(indexer.findByScope('orders').length, 0)
    assert.equal(indexer.findByScope('orders-updated').length, 1)

    assert.match(indexer.generateId(new FakeElement()), /^nu-unknown-/)
    const generated = indexer.generateId(new FakeElement({ attrs: { 'data-nu-scope': 'x' } }))
    assert.match(generated, /^nu-x-/)

    assert.equal(indexer.indexElement(new FakeElement()), null)
    assert.equal(indexer.indexElement(noVerbs), null)
    indexer.destroy()
    assert.equal(indexer.getAll().length, 0)
  } finally {
    console.warn = originalWarn
  }
})

test('MutationObserver keeps added, removed, and changed subtrees synchronized', () => {
  const originalObserver = globalThis.MutationObserver
  FakeMutationObserver.instances = []
  globalThis.MutationObserver = FakeMutationObserver
  try {
    const existingChild = new FakeElement({
      attrs: { 'data-nu-scope': 'existing', 'data-nu-listen': 'view' },
    })
    const root = new FakeElement({ children: [existingChild] })
    const indexer = new DOMIndexer({ root })
    const observer = FakeMutationObserver.instances[0]
    assert.equal(observer.observed.root, root)
    assert.deepEqual(observer.observed.options.attributeFilter, [
      'data-nu-scope', 'data-nu-listen', 'data-nu-act', 'data-nu-meta',
    ])

    const addedChild = new FakeElement({
      attrs: { 'data-nu-scope': 'added-child', 'data-nu-listen': 'open' },
    })
    const added = new FakeElement({
      attrs: { 'data-nu-scope': 'added', 'data-nu-act': 'navigate' },
      children: [addedChild],
    })
    observer.emit([{
      type: 'childList',
      target: root,
      addedNodes: [new FakeElement({ nodeType: 3 }), added],
      removedNodes: [],
    }])
    assert.equal(indexer.findByScope('added').length, 1)
    assert.equal(indexer.findByScope('added-child').length, 1)

    observer.emit([{
      type: 'childList',
      target: root,
      addedNodes: [],
      removedNodes: [new FakeElement({ nodeType: 3 }), added],
    }])
    assert.equal(indexer.findByScope('added').length, 0)
    assert.equal(indexer.findByScope('added-child').length, 0)

    existingChild.attrs['data-nu-scope'] = 'changed'
    observer.emit([{
      type: 'attributes',
      target: existingChild,
      addedNodes: [],
      removedNodes: [],
    }])
    assert.equal(indexer.findByScope('existing').length, 0)
    assert.equal(indexer.findByScope('changed').length, 1)

    observer.emit([{
      type: 'attributes',
      target: new FakeElement({ nodeType: 3 }),
      addedNodes: [],
      removedNodes: [],
    }, {
      type: 'childList',
      target: root,
      addedNodes: [],
      removedNodes: [],
    }])

    indexer.stopObserving()
    assert.equal(observer.disconnected, true)
    indexer.stopObserving()
  } finally {
    if (originalObserver === undefined) Reflect.deleteProperty(globalThis, 'MutationObserver')
    else globalThis.MutationObserver = originalObserver
  }
})

test('indexer observation is optional and unavailable observers fail safely', () => {
  const originalObserver = globalThis.MutationObserver
  Reflect.deleteProperty(globalThis, 'MutationObserver')
  try {
    const root = new FakeElement()
    const noAuto = new DOMIndexer({ root, autoScan: false, observeChanges: false })
    assert.equal(noAuto.getAll().length, 0)
    const unavailable = new DOMIndexer({ root, autoScan: false, observeChanges: true })
    assert.equal(unavailable.getAll().length, 0)
  } finally {
    if (originalObserver !== undefined) globalThis.MutationObserver = originalObserver
  }
})

test('scanner reports scopes, verbs, metadata, duplicates, and root elements', () => {
  const duplicate = new FakeElement({
    attrs: {
      'data-nu-scope': 'orders',
      'data-nu-listen': 'open open',
      'data-nu-act': 'open close',
      'data-nu-meta': '{"count":1}',
    },
  })
  const invalid = new FakeElement({
    attrs: {
      'data-nu-scope': 'orders',
      'data-nu-listen': 'view',
      'data-nu-meta': '{',
    },
  })
  const arrayMetadata = new FakeElement({
    attrs: {
      'data-nu-scope': 'array',
      'data-nu-listen': 'view',
      'data-nu-meta': '[]',
    },
  })
  const noVerbs = new FakeElement({ attrs: { 'data-nu-scope': 'empty' } })
  const nullScope = new FakeElement({ attrs: { 'data-nu-scope': null, 'data-nu-act': 'open' } })
  const explicit = new FakeElement({ id: 'explicit', attrs: { 'data-nu-scope': 'explicit', 'data-nu-act': 'set' } })
  const root = new FakeElement({
    attrs: { 'data-nu-scope': 'root', 'data-nu-act': 'navigate' },
    children: [duplicate, invalid, arrayMetadata, noVerbs, nullScope, explicit],
  })

  const warnings = []
  const originalWarn = console.warn
  console.warn = (...args) => warnings.push(args)
  try {
    const result = scanDOM(root)
    assert.equal(result.stats.total, 5)
    assert.equal(result.stats.byScope.orders, 2)
    assert.equal(result.stats.byVerb.open, 1)
    assert.equal(result.stats.byVerb.view, 2)
    assert.equal(result.elements[0].scope, 'root')
    assert.match(result.elements[1].id, /^nu-orders-/)
    assert.equal(result.elements.at(-1).id, 'explicit')
    assert.deepEqual(result.elements[1].metadata, { count: 1 })
    assert.deepEqual(result.elements[3].metadata, {})
    assert.equal(result.scopes.has('root'), true)
    assert.equal(result.verbs.has('navigate'), true)
    assert.equal(warnings.length, 1)
  } finally {
    console.warn = originalWarn
  }
})

test('scanner lookups avoid selector interpolation and include root actions', () => {
  const suspicious = 'orders"] *'
  const child = new FakeElement({
    attrs: { 'data-nu-scope': suspicious, 'data-nu-listen': 'open' },
  })
  const root = new FakeElement({
    attrs: { 'data-nu-scope': 'root', 'data-nu-act': 'open' },
    children: [child],
  })
  assert.equal(findElementsByScope(suspicious, root)[0], child)
  assert.deepEqual(findElementsByVerb('open', root), [root, child])
  assert.deepEqual(findElementsByVerb('delete', root), [])
})

test('default scanner root uses document.body when available', () => {
  const originalDocument = globalThis.document
  const body = new FakeElement({ attrs: { 'data-nu-scope': 'body', 'data-nu-listen': 'view' } })
  globalThis.document = { body }
  try {
    assert.equal(scanDOM().elements[0].scope, 'body')
    assert.equal(findElementsByScope('body')[0], body)
    assert.equal(findElementsByVerb('view')[0], body)
    assert.equal(new DOMIndexer({ observeChanges: false }).findByScope('body')[0].element, body)
  } finally {
    if (originalDocument === undefined) Reflect.deleteProperty(globalThis, 'document')
    else globalThis.document = originalDocument
  }
})
