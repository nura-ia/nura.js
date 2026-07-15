import assert from 'node:assert/strict'
import test from 'node:test'

import { DOMIndexer, findElementsByScope, parseVerbList } from '../dist/index.js'

class ElementStub {
  constructor(attrs = {}, children = []) {
    this.id = ''
    this.attrs = attrs
    this.children = children
  }
  getAttribute(name) { return Object.hasOwn(this.attrs, name) ? this.attrs[name] : null }
  hasAttribute(name) { return Object.hasOwn(this.attrs, name) }
  contains(value) { return this === value || this.children.some((child) => child.contains(value)) }
  querySelectorAll() { return this.children }
}

test('semantic DOM indexing is stable and selector-safe', () => {
  const suspicious = 'orders"] *'
  const child = new ElementStub({ 'data-nu-scope': suspicious, 'data-nu-listen': 'open reset' })
  const root = new ElementStub({}, [child])
  const indexer = new DOMIndexer({ root, observeChanges: false })
  const firstId = indexer.findByScope(suspicious)[0].id
  indexer.scan()
  assert.equal(indexer.findByScope(suspicious)[0].id, firstId)
  assert.equal(findElementsByScope(suspicious, root)[0], child)
  assert.deepEqual(parseVerbList('open reset increment'), ['open', 'reset', 'increment'])
})
