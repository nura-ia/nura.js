"use client"

import { NuraElement } from "@nura/react"

export function Hero() {
  return (
    <NuraElement
      scope="hero-section"
      listen={["view"]}
      as="section"
      className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
          <span className="gradient-text">Nura.js</span>
        </h1>

        <p className="text-2xl md:text-4xl font-light text-muted-foreground">Haz que tu app respire</p>

        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Make your web applications AI-friendly with semantic markup that AI agents, voice assistants, and automation
          tools can understand.
        </p>

        <div className="flex flex-wrap gap-4 justify-center pt-8">
          <NuraElement
            scope="get-started-button"
            act={["click", "navigate"]}
            as="a"
            href="#demo"
            className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Try Interactive Demo
          </NuraElement>

          <NuraElement
            scope="docs-button"
            act={["click", "navigate"]}
            as="a"
            href="#examples"
            className="px-8 py-4 border-2 border-primary text-primary rounded-lg font-semibold text-lg hover:bg-primary/10 transition-colors"
          >
            View Examples
          </NuraElement>
        </div>

        {/* Code snippet */}
        <div className="pt-12 max-w-2xl mx-auto">
          <div className="gradient-border rounded-lg bg-card p-6 text-left">
            <pre className="text-sm md:text-base font-mono overflow-x-auto">
              <code className="text-foreground">
                {`<div data-nu-scope="modal"
     data-nu-listen="open close"
     data-nu-act="toggle">
  AI can understand this!
</div>`}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </NuraElement>
  )
}
