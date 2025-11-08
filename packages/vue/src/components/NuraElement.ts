import { defineComponent, h, type PropType } from "vue"
import { useNuraElement } from "../composables/use-nura-element"
import type { NuraVerb, NuraScope } from "@nura/core"

export default defineComponent({
  name: "NuraElement",
  props: {
    scope: {
      type: String as PropType<NuraScope>,
      required: true,
    },
    listen: {
      type: Array as PropType<NuraVerb[]>,
      default: () => [],
    },
    act: {
      type: Array as PropType<NuraVerb[]>,
      default: () => [],
    },
    meta: {
      type: Object as PropType<Record<string, unknown>>, 
      default: () => ({}),
    },
    as: {
      type: String,
      default: "div",
    },
  },
  setup(props, { slots }) {
    const elementRef = useNuraElement({
      scope: props.scope,
      listen: props.listen,
      act: props.act,
      meta: props.meta,
    })

    return () => h(props.as ?? "div", { ref: elementRef }, slots.default?.())
  },
})
