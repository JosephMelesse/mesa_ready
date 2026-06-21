import { Router } from 'express'
import { checkReadiness } from '../controllers/readiness.controller.js'

const router = Router()

router.post('/check-readiness', checkReadiness)

export default router
