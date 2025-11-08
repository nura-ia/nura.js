import { defineConfig } from 'tsup'
import path from 'node:path'

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  dts: true,
  format: ['esm', 'cjs'],
  treeshake: true,
  clean: true,
  esbuildPlugins: [
    {
      name: 'external-svelte',
      setup(build) {
        build.onResolve({ filter: /\.svelte$/ }, (args) => ({
          path: path.relative(process.cwd(), path.resolve(args.resolveDir, args.path)),
          external: true,
        }))
      },
    },
  ],
  onSuccess: options?.watch ? undefined : 'pnpm run copy:components',
}))
