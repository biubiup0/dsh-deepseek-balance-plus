/**
 * Minimal build: mirror the plain-ESM sources from src/ into lib/.
 * No transpilation is required for the runtime if the loader accepts ESM JS;
 * swap this for tsc/tsdown only if the client-module bundler demands it.
 */
import { mkdirSync, rmSync, readdirSync, copyFileSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const srcDir = join(root, 'src')
const libDir = join(root, 'lib')

function copyTree(from, to) {
  for (const name of readdirSync(from)) {
    const a = join(from, name)
    const b = join(to, name)
    if (statSync(a).isDirectory()) {
      mkdirSync(b, { recursive: true })
      copyTree(a, b)
    } else {
      copyFileSync(a, b)
    }
  }
}

rmSync(libDir, { recursive: true, force: true })
if (existsSync(srcDir)) {
  mkdirSync(libDir, { recursive: true })
  copyTree(srcDir, libDir)
}
console.log('build: src/ -> lib/ (plain ESM mirror)')
