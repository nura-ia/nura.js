<script lang="ts">
  import { nura } from "../actions/nura"
  import type { NuraVerb, NuraScope } from "@nura/core"

  interface Props {
    scope: NuraScope;
    listen?: NuraVerb[];
    act?: NuraVerb[];
    meta?: Record<string, any>;
    as?: string;
    children?: import('svelte').Snippet;
  }

  let {
    scope,
    listen = [],
    act = [],
    meta = {},
    as = "div",
    children
  }: Props = $props();
</script>

<svelte:element this={as} use:nura={{ scope, listen, act, meta }}>
  {@render children?.()}
</svelte:element>
