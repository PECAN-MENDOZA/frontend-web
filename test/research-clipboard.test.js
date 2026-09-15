import test from 'node:test'
import assert from 'node:assert/strict'
import { copyText, copyWithFallback } from '../src/features/research/utils/clipboard.js'

function fakeDocument({ execCommand }) {
  const body = {
    children: [],
    appendChild(node) {
      this.children.push(node)
      node.parent = this
    },
  }

  return {
    body,
    createElement() {
      return {
        value: '',
        style: {},
        attributes: {},
        parent: null,
        setAttribute(name, value) {
          this.attributes[name] = value
        },
        select() {},
        remove() {
          if (this.parent) {
            this.parent.children = this.parent.children.filter((child) => child !== this)
            this.parent = null
          }
        },
      }
    },
    execCommand,
  }
}

test('copyWithFallback removes the textarea and clears the code when execCommand throws', () => {
  const doc = fakeDocument({
    execCommand() {
      throw new Error('execCommand is not supported')
    },
  })
  let field = null
  const original = doc.createElement
  doc.createElement = () => {
    field = original()
    return field
  }

  assert.equal(copyWithFallback('K7MP2XQ9', doc), false)
  assert.deepEqual(doc.body.children, [])
  assert.equal(field.value, '')
})

test('copyWithFallback reports success only when execCommand returns true', () => {
  const successDoc = fakeDocument({ execCommand: () => true })
  const failureDoc = fakeDocument({ execCommand: () => false })

  assert.equal(copyWithFallback('K7MP2XQ9', successDoc), true)
  assert.deepEqual(successDoc.body.children, [])
  assert.equal(copyWithFallback('K7MP2XQ9', failureDoc), false)
  assert.deepEqual(failureDoc.body.children, [])
})

test('copyWithFallback returns the focus to the element that had it before selecting', () => {
  for (const execCommand of [() => true, () => false]) {
    const doc = fakeDocument({ execCommand })
    const button = {
      isConnected: true,
      focus() {
        doc.activeElement = this
      },
    }
    const original = doc.createElement

    doc.activeElement = button
    doc.createElement = () => {
      const field = original()

      field.select = () => {
        doc.activeElement = field
      }

      return field
    }

    copyWithFallback('K7MP2XQ9', doc)
    assert.equal(doc.activeElement, button)
  }
})

test('copyWithFallback leaves the focus alone when the previous element left the DOM', () => {
  const doc = fakeDocument({ execCommand: () => true })
  let focused = 0
  const detached = {
    isConnected: false,
    focus() {
      focused += 1
    },
  }

  doc.activeElement = detached
  copyWithFallback('K7MP2XQ9', doc)
  assert.equal(focused, 0)
})

test('copyText prefers the async clipboard and falls back when it rejects', async () => {
  const written = []
  const clipboard = {
    async writeText(value) {
      written.push(value)
    },
  }
  const rejecting = {
    async writeText() {
      throw new Error('denied')
    },
  }

  assert.equal(await copyText('ABCD1234', { clipboard }), true)
  assert.deepEqual(written, ['ABCD1234'])
  assert.equal(
    await copyText('ABCD1234', {
      clipboard: rejecting,
      doc: fakeDocument({ execCommand: () => true }),
    }),
    true,
  )
  assert.equal(
    await copyText('ABCD1234', {
      clipboard: rejecting,
      doc: fakeDocument({ execCommand: () => false }),
    }),
    false,
  )
  assert.equal(await copyText('ABCD1234', { clipboard: undefined, doc: undefined }), false)
})
