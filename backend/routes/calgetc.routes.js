import { Router } from 'express'
import { checkCalGetc } from '../controllers/calgetc.controller.js'

const router = Router()

router.post('/check-calgetc', checkCalGetc)

export default router
