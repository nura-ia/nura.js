<script lang="ts">
  import { onDestroy } from "svelte"
  import { initNura } from "../context"
  import type { NuraConfig } from "@nura/core"

  interface Props {
    config?: NuraConfig | undefined;
    children?: import('svelte').Snippet;
  }

  let { config = undefined, children }: Props = $props();

  const { indexer } = initNura(config)

  onDestroy(() => {
    indexer.destroy()
  })
</script>

{@render children?.()}
