import { forwardRef, type ComponentPropsWithRef, type ElementType } from "react"
import { useNuraElement, type UseNuraElementOptions } from "../use-nura-element"

export interface NuraElementProps extends UseNuraElementOptions, Omit<ComponentPropsWithRef<"div">, "ref"> {
  as?: ElementType
  href?: string
}

export const NuraElement = forwardRef<HTMLElement, NuraElementProps>(
  ({ as: Component = "div", scope, listen, act, meta, children, ...props }, externalRef) => {
    const internalRef = useNuraElement({ scope, listen, act, meta })

    const mergedRef = (node: HTMLElement | null) => {
      if (internalRef) {
        ;(internalRef as any).current = node
      }
      if (typeof externalRef === "function") {
        externalRef(node)
      } else if (externalRef) {
        ;(externalRef as any).current = node
      }
    }

    return (
      <Component ref={mergedRef} {...props}>
        {children}
      </Component>
    )
  },
)

NuraElement.displayName = "NuraElement"
