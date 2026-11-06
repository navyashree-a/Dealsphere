import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { routeRequest } from './server/dealsApi.js'
import { routeGoogleRequest } from './server/googleAuth.js'
import { routeUserRequest } from './server/userApi.js'
import { memoryStore, routeOtpRequest } from './server/whatsappOtp.js'

// Runs the backend (server/dealsApi.js, server/whatsappOtp.js,
// server/userApi.js) inside Vite's dev and preview servers, so the website can
// call /api/... and /go/:id locally. PINNACLE_* settings come from .env.local;
// without them, WhatsApp codes are shown on screen as a labelled demo
// (devFallback). Sessions and saved deals are kept in memory until restart.
const backend = (env) => {
  const usersStore = memoryStore()
  const otpDeps = { store: memoryStore(), devFallback: true, sessionStore: usersStore }

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
      if (!/^\/(api|go)\//.test(url.pathname)) return next()
      const headers = { 'content-type': req.headers['content-type'] || '', cookie: req.headers.cookie || '' }
      const request = req.method === 'POST' || req.method === 'PUT'
        ? new Request(url, { method: req.method, headers, body: await readBody(req) })
        : new Request(url, { method: req.method, headers })
      const response =
        (await routeOtpRequest(request, env, otpDeps)) ||
        (await routeGoogleRequest(request, env, { sessionStore: usersStore })) ||
        (await routeUserRequest(request, usersStore)) ||
        routeRequest(request)
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

// The Google Client ID lives in wrangler.toml (GOOGLE_CLIENT_ID), so the live
// site's build and its server read the same value. VITE_GOOGLE_CLIENT_ID in
// .env.local overrides it for local testing.
const wranglerVar = (name) => {
  try {
    return readFileSync(new URL('./wrangler.toml', import.meta.url), 'utf8').match(new RegExp('^' + name + '\\s*=\\s*"([^"]*)"', 'm'))?.[1] || ''
  } catch {
    return ''
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['PINNACLE_', 'VITE_GOOGLE_'])
  const googleClientId = (env.VITE_GOOGLE_CLIENT_ID || wranglerVar('GOOGLE_CLIENT_ID')).trim()
  return {
    plugins: [react(), backend({ ...env, GOOGLE_CLIENT_ID: googleClientId })],
    define: { 'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(googleClientId) },
  }
})
