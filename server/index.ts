import express from 'express'
import path from 'path'
import { ensureSchema } from './schema.js'
import majorsRouter from './routes/majors.js'
import coursesRouter from './routes/courses.js'
import readinessRouter from './routes/readiness.js'
import calgetcRouter from './routes/calgetc.js'

const app = express()
app.use(express.json())

app.use('/api', majorsRouter)
app.use('/api', coursesRouter)
app.use('/api', readinessRouter)
app.use('/api', calgetcRouter)

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(process.cwd(), 'client/dist')
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

const PORT = process.env.PORT ?? 3001

async function start() {
  await ensureSchema()
  app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`))
}

start().catch((err) => {
  console.error('Failed to initialize database schema', err)
  process.exit(1)
})
