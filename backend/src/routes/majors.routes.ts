import { Router } from 'express'
import { listMajors } from '../controllers/majors.controller.js'

const router = Router()

router.get('/majors', listMajors)

export default router
