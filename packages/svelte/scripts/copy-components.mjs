import { cp, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(root, '..', 'src', 'components')
const outDir = path.resolve(root, '..', 'dist', 'components')

await mkdir(outDir, { recursive: true })
await cp(srcDir, outDir, { recursive: true })
