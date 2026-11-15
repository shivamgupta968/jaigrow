import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import productRoutes from './routes/products.js'
import orderRoutes from './routes/orders.js'
import authRoutes from './routes/auth.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)

const allowedOrigins = [...new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  ...configuredOrigins
])]

app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    return callback(new Error('Origin not allowed by CORS'))
  }
}))
app.use(express.json({ limit: '1mb' }))

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}))

app.get('/', (req, res) => res.json({ message: 'JaiGrow API is running' }))

app.get('/api/health', (req, res) => res.json({
  success: true,
  message: 'JaiGrow backend is healthy',
  database: mongoose.connection.readyState === 1 ? 'connected' : 'not connected',
  timestamp: new Date().toISOString()
}))

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)

app.use((err, req, res, next) => {
  console.error(err.message)
  res.status(500).json({ success: false, message: 'Internal server error' })
})

const startServer = async () => {
  await connectDB()
  app.listen(PORT, () => console.log(`JaiGrow backend running at http://localhost:${PORT}`))
}

startServer().catch(error => {
  console.error('Server startup failed:', error.message)
  process.exit(1)
})

