"use client"

import { useState } from "react"
import { useNuraAction, NuraElement, NuraButton } from "@nura/react"

export function InteractiveDemo() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  // Register actions
  useNuraAction({
    verb: "open",
    scope: "demo-modal",
    handler: () => {
      setIsModalOpen(true)
      addLog("Modal opened via Nura action")
    },
  })

  useNuraAction({
    verb: "close",
    scope: "demo-modal",
    handler: () => {
      setIsModalOpen(false)
      addLog("Modal closed via Nura action")
    },
  })

  useNuraAction({
    verb: "increment",
    scope: "demo-counter",
    handler: () => {
      setCount((c) => c + 1)
      addLog("Counter incremented via Nura action")
    },
  })

  useNuraAction({
    verb: "reset",
    scope: "demo-counter",
    handler: () => {
      setCount(0)
      addLog("Counter reset via Nura action")
    },
  })

  return (
    <NuraElement scope="interactive-demo-section" listen={["view"]} as="section" id="demo" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
          Interactive <span className="gradient-text">Demo</span>
        </h2>
        <p className="text-center text-muted-foreground mb-12 text-lg">
          Try these interactive examples. Open DevTools console to see Nura events.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Counter Demo */}
          <NuraElement
            scope="counter-demo"
            listen={["view"]}
            as="div"
            className="bg-card rounded-lg p-8 border border-border"
          >
            <h3 className="text-2xl font-semibold mb-4">Counter Demo</h3>
            <p className="text-muted-foreground mb-6">This counter uses Nura actions for increment and reset.</p>

            <div className="text-center mb-6">
              <div className="text-6xl font-bold gradient-text mb-4">{count}</div>
            </div>

            <div className="flex gap-4">
              <NuraButton
                scope="increment-button"
                onClick={() => setCount((c) => c + 1)}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                Increment
              </NuraButton>
              <NuraButton
                scope="reset-button"
                onClick={() => setCount(0)}
                className="flex-1 px-6 py-3 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary/10 transition-colors"
              >
                Reset
              </NuraButton>
            </div>
          </NuraElement>

          {/* Modal Demo */}
          <NuraElement
            scope="modal-demo"
            listen={["view"]}
            as="div"
            className="bg-card rounded-lg p-8 border border-border"
          >
            <h3 className="text-2xl font-semibold mb-4">Modal Demo</h3>
            <p className="text-muted-foreground mb-6">This modal uses Nura actions for open and close operations.</p>

            <NuraButton
              scope="open-modal-button"
              onClick={() => setIsModalOpen(true)}
              className="w-full px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Open Modal
            </NuraButton>
          </NuraElement>
        </div>

        {/* Event Log */}
        <NuraElement
          scope="event-log"
          listen={["view"]}
          as="div"
          className="mt-8 bg-card rounded-lg p-6 border border-border"
        >
          <h3 className="text-xl font-semibold mb-4">Event Log</h3>
          <div className="bg-muted rounded p-4 h-48 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">No events yet. Try interacting with the demos above.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </NuraElement>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <NuraElement
          scope="demo-modal"
          listen={["close"]}
          as="div"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-card rounded-lg p-8 max-w-md w-full border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-semibold mb-4">Demo Modal</h3>
            <p className="text-muted-foreground mb-6">
              This modal is controlled by Nura actions. AI agents can open and close it using the registered actions.
            </p>
            <NuraButton
              scope="close-modal-button"
              onClick={() => setIsModalOpen(false)}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Close Modal
            </NuraButton>
          </div>
        </NuraElement>
      )}
    </NuraElement>
  )
}
