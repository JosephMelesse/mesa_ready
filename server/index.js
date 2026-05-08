import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { ensureSchema } from './schema.js'
import majorsRouter from './routes/majors.js'
import coursesRouter from './routes/courses.js'
import readinessRouter from './routes/readiness.js'
import calgetcRouter from './routes/calgetc.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, '../public')))

app.use('/api', majorsRouter)
app.use('/api', coursesRouter)
app.use('/api', readinessRouter)
app.use('/api', calgetcRouter)

const PORT = process.env.PORT ?? 3001

async function start() {
  await ensureSchema()
  app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`))
}

start().catch((error) => {
  console.error('Failed to initialize database schema', error)
  process.exit(1)
})
