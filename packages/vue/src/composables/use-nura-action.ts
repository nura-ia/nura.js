import { onMounted, onBeforeUnmount, watch, toRef, unref, type Ref } from "vue"
import { useNuraInstance } from "../plugin"
import type { NuraAction, NuraVerb, NuraScope } from "@nura/core"

export interface UseNuraActionOptions {
  verb: NuraVerb | Ref<NuraVerb>
  scope: NuraScope | Ref<NuraScope>
  handler: (params?: Record<string, any>) => void | Promise<void>
  description?: string | Ref<string>
  metadata?: Record<string, any> | Ref<Record<string, any>>
  enabled?: boolean | Ref<boolean>
}

export function useNuraAction(options: UseNuraActionOptions) {
  const { registry } = useNuraInstance()

  const verbRef = toRef(options, "verb") as Ref<NuraVerb>
  const scopeRef = toRef(options, "scope") as Ref<NuraScope>
  const descriptionRef = toRef(options, "description") as Ref<string | undefined>
  const metadataRef = toRef(options, "metadata") as Ref<Record<string, any> | undefined>
  const enabledRef = toRef(options, "enabled") as Ref<boolean | undefined>

  const register = () => {
    if (enabledRef.value === false) return

    const action: NuraAction = {
      verb: unref(verbRef),
      scope: unref(scopeRef),
      handler: options.handler,
      description: unref(descriptionRef),
      metadata: unref(metadataRef),
    }

    registry.registerAction(action)
  }

  const unregister = () => {
    registry.unregisterAction(unref(verbRef), unref(scopeRef))
  }

  onMounted(() => {
    register()
  })

  onBeforeUnmount(() => {
    unregister()
  })

  watch([verbRef, scopeRef, descriptionRef, metadataRef, enabledRef], () => {
    unregister()
    register()
  })

  const execute = async (params?: Record<string, any>) => {
    return registry.executeAction(unref(verbRef), unref(scopeRef), params)
  }

  return { execute }
}
