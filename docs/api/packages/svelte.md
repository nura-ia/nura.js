# @nura/svelte

Svelte adapter for Nura.js - Make your Svelte apps AI-friendly.

## Installation

\`\`\`bash
npm install @nura/svelte @nura/core @nura/dom
# or
pnpm add @nura/svelte @nura/core @nura/dom
\`\`\`

## Usage

### Setup Context

\`\`\`svelte
<script>
  import { NuraProvider } from '@nura/svelte'
</script>

<NuraProvider config={{ debug: true }}>
  <YourApp />
</NuraProvider>
\`\`\`

Or initialize manually:

\`\`\`svelte
<script>
  import { initNura } from '@nura/svelte'
  
  initNura({ debug: true })
</script>
\`\`\`

### Register Actions

\`\`\`svelte
<script>
  import { useNuraAction } from '@nura/svelte'

  useNuraAction({
    verb: 'open',
    scope: 'modal',
    handler: () => {
      console.log('Opening modal')
    }
  })
</script>
\`\`\`

### Use Actions

\`\`\`svelte
<script>
  import { nura } from '@nura/svelte'
</script>

<div use:nura={{ scope: 'form', listen: ['submit'] }}>
  <button use:nura={{ scope: 'submit-button', act: ['click'] }}>
    Submit
  </button>
</div>
\`\`\`

### Use Components

\`\`\`svelte
<script>
  import { NuraElement } from '@nura/svelte'
</script>

<NuraElement scope="form" listen={['submit']}>
  <NuraElement scope="submit-button" act={['click']} as="button">
    Submit
  </NuraElement>
</NuraElement>
\`\`\`

### Use Stores

\`\`\`svelte
<script>
  import { createNuraStore } from '@nura/svelte'

  const { actions, elements } = createNuraStore()
</script>

<p>Total actions: {$actions.length}</p>
<p>Total elements: {$elements.length}</p>
\`\`\`

## API

### Context

- \`initNura(config)\` - Initialize Nura context
- \`getNuraContext()\` - Get Nura context

### Actions

- \`use:nura\` - Add Nura attributes to elements
- \`use:nuraAction\` - Register actions on elements

### Components

- \`<NuraProvider>\` - Context provider component
- \`<NuraElement>\` - Generic element wrapper

### Stores

- \`createNuraStore()\` - Create reactive store for actions and elements
- \`createActionStore(scope?)\` - Create store for actions
- \`createPermissionStore(verb, scope)\` - Create store for permissions

### Utils

- \`useNura()\` - Access registry and indexer
- \`useNuraAction(options)\` - Register actions
- \`useNuraPermission(options)\` - Add permissions
- \`useHasPermission(verb, scope)\` - Check permissions
- \`useNuraEvent(type, listener)\` - Listen to Nura events

## License

MIT
