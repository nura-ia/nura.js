"use client"

import { forwardRef, type ComponentPropsWithRef } from "react"
import { useNuraElement } from "../use-nura-element"
import type { NuraScope } from "@nura/core"

export interface NuraButtonProps extends Omit<ComponentPropsWithRef<"button">, "ref"> {
  scope: NuraScope
  meta?: Record<string, any>
}

export const NuraButton = forwardRef<HTMLButtonElement, NuraButtonProps>(
  ({ scope, meta, children, onClick, ...props }, externalRef) => {
    const internalRef = useNuraElement<HTMLButtonElement>({
      scope,
      act: ["click"],
      meta,
    })

    const mergedRef = (node: HTMLButtonElement | null) => {
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
      <button ref={mergedRef} onClick={onClick} {...props}>
        {children}
      </button>
    )
  },
)

NuraButton.displayName = "NuraButton"
