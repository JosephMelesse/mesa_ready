import { Router } from 'express'
import majorsRoutes from './majors.routes.js'
import coursesRoutes from './courses.routes.js'
import readinessRoutes from './readiness.routes.js'
import calgetcRoutes from './calgetc.routes.js'

const router = Router()

router.use(majorsRoutes)
router.use(coursesRoutes)
router.use(readinessRoutes)
router.use(calgetcRoutes)

export default router
