import type { SvelteComponentTyped } from 'svelte'

declare class NuraProvider extends SvelteComponentTyped<Record<string, unknown>, Record<string, CustomEvent<unknown>>, { default:
 {} }> {}

export default NuraProvider
