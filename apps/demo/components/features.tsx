"use client"

import { NuraElement } from "@nura/react"

const features = [
  {
    title: "AI-Friendly Markup",
    description: "Semantic data attributes that describe your UI's intent and capabilities",
    icon: "🤖",
  },
  {
    title: "Framework Agnostic",
    description: "Works with React, Vue, Svelte, or vanilla JavaScript",
    icon: "⚡",
  },
  {
    title: "Action Registry",
    description: "Centralized system for routing AI commands to your application",
    icon: "🎯",
  },
  {
    title: "Type-Safe",
    description: "Full TypeScript support with comprehensive type definitions",
    icon: "🔒",
  },
  {
    title: "Voice Ready",
    description: "Built-in plugin for voice interaction capabilities",
    icon: "🎤",
  },
  {
    title: "DevTools",
    description: "Visual overlay for development and debugging",
    icon: "🛠️",
  },
]

export function Features() {
  return (
    <NuraElement scope="features-section" listen={["view"]} as="section" className="py-24 px-4 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
          Why <span className="gradient-text">Nura.js</span>?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <NuraElement
              key={index}
              scope={`feature-card-${index}`}
              listen={["view", "hover"]}
              as="div"
              className="bg-card rounded-lg p-6 border border-border hover:border-primary/50 transition-colors"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </NuraElement>
          ))}
        </div>
      </div>
    </NuraElement>
  )
}
