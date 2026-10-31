import { Buffer } from 'node:buffer'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { routeRequest } from './server/dealsApi.js'
import { memoryStore, routeOtpRequest } from './server/whatsappOtp.js'

// Runs the backend (server/dealsApi.js, server/whatsappOtp.js) inside Vite's
// dev and preview servers, so the website can call /api/... and /go/:id
// locally. PINNACLE_* settings come from .env.local; without them, WhatsApp
// codes are shown on screen as a labelled demo (devFallback).
const backend = (env) => {
  const otpDeps = { store: memoryStore(), devFallback: true }

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      const chunks = []
      req.on('data', (chunk) => chunks.push(chunk))
      req.on('end', () => resolve(Buffer.concat(chunks)))
      req.on('error', reject)
    })

  const middleware = async (req, res, next) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      const request = req.method === 'POST'
        ? new Request(url, { method: 'POST', headers: { 'content-type': req.headers['content-type'] || '' }, body: await readBody(req) })
        : new Request(url, { method: req.method })
      const response = (await routeOtpRequest(request, env, otpDeps)) || routeRequest(request)
      if (!response) return next()
      res.statusCode = response.status
      response.headers.forEach((value, key) => res.setHeader(key, value))
      res.end(req.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()))
    } catch (error) {
      next(error)
    }
  }
  return {
    name: 'dealsphere-api',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), backend(loadEnv(mode, process.cwd(), 'PINNACLE_'))],
}))
