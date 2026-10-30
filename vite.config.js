import { Buffer } from 'node:buffer'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { routeRequest } from './server/dealsApi.js'

// Runs the backend (server/dealsApi.js) inside Vite's dev and preview servers,
// so the website can call /api/deals and /go/:id locally.
const dealsApi = () => {
  const middleware = async (req, res, next) => {
    try {
      const response = routeRequest(new Request(new URL(req.url, 'http://localhost'), { method: req.method }))
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
export default defineConfig({
  plugins: [react(), dealsApi()],
})
