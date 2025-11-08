import type { SvelteComponentTyped } from 'svelte'

declare class NuraElement extends SvelteComponentTyped<Record<string, unknown>, Record<string, CustomEvent<unknown>>, { default: {}
}> {}

export default NuraElement
