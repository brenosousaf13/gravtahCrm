const { readFileSync, existsSync } = require('node:fs')
const { resolve, dirname } = require('node:path')
const { createRequire } = require('node:module')
const ts = require('typescript')

// Only replace external boundaries; execute the real application source.
function loadSource(relativePath, stubs = {}, cache = new Map()) {
    const filename = resolve(__dirname, '../..', relativePath)
    if (cache.has(filename)) return cache.get(filename)
    const result = { exports: {} }
    cache.set(filename, result.exports)
    const nativeRequire = createRequire(filename)
    const sourceRequire = (name) => {
        if (Object.hasOwn(stubs, name)) return stubs[name]
        if (name.startsWith('@/') || name.startsWith('.')) {
            const base = name.startsWith('@/')
                ? resolve(__dirname, '../../src', name.slice(2))
                : resolve(dirname(filename), name)
            const source = ['.ts', '.tsx'].map(ext => base + ext).find(existsSync)
            if (source) return loadSource(source, stubs, cache)
        }
        return nativeRequire(name)
    }
    const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
        fileName: filename,
    })
    new Function('require', 'module', 'exports', outputText)(sourceRequire, result, result.exports)
    cache.set(filename, result.exports)
    return result.exports
}

module.exports = { loadSource }
