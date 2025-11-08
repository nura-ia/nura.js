"use client"

import { useState } from "react"
import { NuraElement } from "@nura/react"

const examples = {
  react: `import { NuraProvider, useNuraAction, NuraButton } from '@nura/react'

function App() {
  return (
    <NuraProvider config={{ debug: true }}>
      <MyComponent />
    </NuraProvider>
  )
}

function MyComponent() {
  useNuraAction({
    verb: 'open',
    scope: 'modal',
    handler: () => console.log('Opening modal')
  })

  return (
    <NuraButton scope="submit-button">
      Submit
    </NuraButton>
  )
}`,
  vue: `<script setup>
import { NuraProvider } from '@nura/vue'
import { useNuraAction } from '@nura/vue'

useNuraAction({
  verb: 'open',
  scope: 'modal',
  handler: () => console.log('Opening modal')
})
</script>

<template>
  <NuraProvider :config="{ debug: true }">
    <div v-nura="{ scope: 'form', listen: ['submit'] }">
      <button v-nura="{ scope: 'submit-button', act: ['click'] }">
        Submit
      </button>
    </div>
  </NuraProvider>
</template>`,
  svelte: `<script>
  import { NuraProvider, nura } from '@nura/svelte'
  import { useNuraAction } from '@nura/svelte'

  useNuraAction({
    verb: 'open',
    scope: 'modal',
    handler: () => console.log('Opening modal')
  })
</script>

<NuraProvider config={{ debug: true }}>
  <div use:nura={{ scope: 'form', listen: ['submit'] }}>
    <button use:nura={{ scope: 'submit-button', act: ['click'] }}>
      Submit
    </button>
  </div>
</NuraProvider>`,
}

export function CodeExamples() {
  const [activeTab, setActiveTab] = useState<keyof typeof examples>("react")

  return (
    <NuraElement
      scope="code-examples-section"
      listen={["view"]}
      as="section"
      id="examples"
      className="py-24 px-4 bg-muted/30"
    >
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
          Code <span className="gradient-text">Examples</span>
        </h2>
        <p className="text-center text-muted-foreground mb-12 text-lg">
          See how easy it is to use Nura.js with your favorite framework
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 justify-center">
          {(Object.keys(examples) as Array<keyof typeof examples>).map((framework) => (
            <button
              key={framework}
              onClick={() => setActiveTab(framework)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === framework
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground hover:bg-muted"
              }`}
            >
              {framework.charAt(0).toUpperCase() + framework.slice(1)}
            </button>
          ))}
        </div>

        {/* Code block */}
        <div className="gradient-border rounded-lg bg-card p-6">
          <pre className="text-sm md:text-base font-mono overflow-x-auto">
            <code className="text-foreground">{examples[activeTab]}</code>
          </pre>
        </div>

        {/* Installation */}
        <div className="mt-8 bg-card rounded-lg p-6 border border-border">
          <h3 className="text-xl font-semibold mb-4">Installation</h3>
          <pre className="bg-muted rounded p-4 font-mono text-sm overflow-x-auto">
            <code>npm install @nura/{activeTab} @nura/core @nura/dom</code>
          </pre>
        </div>
      </div>
    </NuraElement>
  )
}
