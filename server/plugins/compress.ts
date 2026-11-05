import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

// Rendered pages, the sitemap and CMS data, compressed as they go out. (JS and CSS
// are compressed at build: nitro.compressPublicAssets, nuxt.config.ts.) Brotli at a
// middling quality: the highest would cost more time than the bytes it saves.
const COMPRESSIBLE = /^(text\/|application\/(json|xml|javascript))/
const MIN_BYTES = 1024

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event, response) => {
    const { body } = response
    if (event.method === 'HEAD' || typeof body !== 'string' || Buffer.byteLength(body) < MIN_BYTES) return
    if (getResponseHeader(event, 'Content-Encoding')) return
    if (!COMPRESSIBLE.test(String(getResponseHeader(event, 'Content-Type') ?? 'text/html'))) return

    const accepted = getRequestHeader(event, 'accept-encoding') ?? ''
    const brotli = /\bbr\b/.test(accepted)
    if (!brotli && !/\bgzip\b/.test(accepted)) return

    const compressed = brotli
      ? brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })
      : gzipSync(body)
    response.body = compressed
    setResponseHeader(event, 'Content-Encoding', brotli ? 'br' : 'gzip')
    setResponseHeader(event, 'Content-Length', compressed.length)
    appendResponseHeader(event, 'Vary', 'Accept-Encoding')
  })
})
