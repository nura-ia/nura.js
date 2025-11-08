import { onMounted, onBeforeUnmount, ref, watch, toRef, unref, type Ref } from "vue"
import { useNuraInstance } from "../plugin"
import type { NuraVerb, NuraScope, NuraPermission } from "@nura/core"

export interface UseNuraPermissionOptions {
  scope: NuraScope | Ref<NuraScope>
  verbs: NuraVerb[] | Ref<NuraVerb[]>
  condition?: (() => boolean | Promise<boolean>) | Ref<() => boolean | Promise<boolean>>
}

export function useNuraPermission(options: UseNuraPermissionOptions) {
  const { registry } = useNuraInstance()

  const scopeRef = toRef(options, "scope") as Ref<NuraScope>
  const verbsRef = toRef(options, "verbs") as Ref<NuraVerb[]>
  const conditionRef = toRef(options, "condition") as Ref<(() => boolean | Promise<boolean>) | undefined>

  const register = () => {
    const permission: NuraPermission = {
      scope: unref(scopeRef),
      verbs: unref(verbsRef),
      condition: unref(conditionRef),
    }

    registry.addPermission(permission)
  }

  const unregister = () => {
    registry.removePermission(unref(scopeRef))
  }

  onMounted(() => {
    register()
  })

  onBeforeUnmount(() => {
    unregister()
  })

  watch([scopeRef, verbsRef, conditionRef], () => {
    unregister()
    register()
  })
}

export function useHasPermission(verb: NuraVerb | Ref<NuraVerb>, scope: NuraScope | Ref<NuraScope>) {
  const { registry } = useNuraInstance()
  const hasPermission = ref(true)

  const verbRef = toRef(verb) as Ref<NuraVerb>
  const scopeRef = toRef(scope) as Ref<NuraScope>

  const check = async () => {
    hasPermission.value = await registry.hasPermission(unref(verbRef), unref(scopeRef))
  }

  onMounted(() => {
    check()
  })

  watch([verbRef, scopeRef], () => {
    check()
  })

  return hasPermission
}
