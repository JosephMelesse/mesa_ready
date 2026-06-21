import { Router } from 'express'
import { listCerritosCourses } from '../controllers/courses.controller.js'

const router = Router()

router.get('/cerritos-courses', listCerritosCourses)

export default router
