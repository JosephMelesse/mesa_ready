import { type Request, type Response, type NextFunction } from 'express'

// Express 5 forwards rejected promises from async handlers here, so controllers
// can simply throw / await without wrapping every body in try/catch.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err)
  if (res.headersSent) return
  res.status(500).json({ error: String(err) })
}
