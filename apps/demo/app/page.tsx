"use client"

import { NuraProvider } from "@nura/react"
import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { InteractiveDemo } from "@/components/interactive-demo"
import { CodeExamples } from "@/components/code-examples"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <NuraProvider config={{ debug: true }}>
      <main className="min-h-screen">
        <Hero />
        <Features />
        <InteractiveDemo />
        <CodeExamples />
        <Footer />
      </main>
    </NuraProvider>
  )
}
