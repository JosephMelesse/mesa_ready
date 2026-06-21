import express from 'express'
import cors from 'cors'
import apiRoutes from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'

export function createApp() {
  const app = express()

  // Frontend is deployed on a separate origin, so the browser sends cross-origin
  // requests (and preflights the JSON POSTs). CORS_ORIGIN is a comma-separated
  // allowlist of frontend origins; omit it to allow any origin.
  const allowed = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean)
  app.use(cors({ origin: allowed?.length ? allowed : true }))

  app.use(express.json())

  app.use('/api', apiRoutes)
  // The frontend is deployed separately, so every route is an API route;
  // unmatched ones get a JSON 404.
  app.use('/api', notFound)

  app.use(errorHandler)
  return app
}
