# @nura/react

React adapter for Nura.js - Make your React apps AI-friendly.

## Installation

\`\`\`bash
npm install @nura/react @nura/core @nura/dom
# or
pnpm add @nura/react @nura/core @nura/dom
\`\`\`

## Usage

### Setup Provider

\`\`\`tsx
import { NuraProvider } from '@nura/react'

function App() {
  return (
    <NuraProvider config={{ debug: true }}>
      <YourApp />
    </NuraProvider>
  )
}
\`\`\`

### Register Actions

\`\`\`tsx
import { useNuraAction } from '@nura/react'

function MyComponent() {
  useNuraAction({
    verb: 'open',
    scope: 'modal',
    handler: () => {
      console.log('Opening modal')
    }
  })

  return <div>My Component</div>
}
\`\`\`

### Mark Elements

\`\`\`tsx
import { useNuraElement } from '@nura/react'

function Button() {
  const ref = useNuraElement<HTMLButtonElement>({
    scope: 'submit-button',
    act: ['click', 'submit']
  })

  return <button ref={ref}>Submit</button>
}
\`\`\`

### Use Components

\`\`\`tsx
import { NuraElement, NuraButton } from '@nura/react'

function Form() {
  return (
    <NuraElement scope="form" listen={['submit']}>
      <NuraButton scope="submit-button">
        Submit
      </NuraButton>
    </NuraElement>
  )
}
\`\`\`

## API

### Hooks

- \`useNura()\` - Access registry and indexer
- \`useNuraAction(options)\` - Register actions
- \`useNuraElement(options)\` - Mark elements with Nura attributes
- \`useNuraPermission(options)\` - Add permissions
- \`useHasPermission(verb, scope)\` - Check permissions
- \`useNuraEvent(type, listener)\` - Listen to Nura events

### Components

- \`<NuraProvider>\` - Context provider
- \`<NuraElement>\` - Generic element wrapper
- \`<NuraButton>\` - Button with Nura attributes

## License

MIT
\`\`\`
