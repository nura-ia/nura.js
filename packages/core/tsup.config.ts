import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    agent: 'src/agent.ts',
    runtime: 'src/runtime.ts',
    permissions: 'src/permissions.ts',
    wake: 'src/wake.ts',
    context: 'src/context.ts',
    locale: 'src/locale.ts',
    numerals: 'src/numerals.ts',
    synonyms: 'src/synonyms.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
})
