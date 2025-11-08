import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    wake: 'src/wake.ts',
    context: 'src/context.ts',
    locale: 'src/locale.ts',
    numerals: 'src/numerals.ts',
    synonyms: 'src/synonyms.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: false,
  clean: true,
  splitting: false,
  treeshake: true,
})
