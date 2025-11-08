"use client"

import { NuraElement } from "@nura/react"

export function Footer() {
  return (
    <NuraElement scope="footer-section" listen={["view"]} as="footer" className="py-12 px-4 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4 gradient-text">Nura.js</h3>
            <p className="text-muted-foreground leading-relaxed">
              Make your web applications AI-friendly with semantic markup.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  NPM
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Community</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Discord
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Twitter
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Contributing
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="text-center text-muted-foreground pt-8 border-t border-border">
          <p>© 2025 Nura.js. MIT License.</p>
        </div>
      </div>
    </NuraElement>
  )
}
