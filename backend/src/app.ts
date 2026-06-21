import express from 'express'
import path from 'path'
import apiRoutes from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'

export function createApp() {
  const app = express()
  app.use(express.json())

  app.use('/api', apiRoutes)
  // Unmatched API routes get a JSON 404 (rather than the SPA fallback below).
  app.use('/api', notFound)

  if (process.env.NODE_ENV === 'production') {
    const clientDist = path.join(process.cwd(), 'client/dist')
    app.use(express.static(clientDist))
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  app.use(errorHandler)
  return app
}
