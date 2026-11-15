import express from 'express'
import mongoose from 'mongoose'
import Product from '../models/Product.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query
    const filter = { isActive: true }
    if (category && category !== 'All') filter.category = category
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ]
    }
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50)
    const products = await Product.find(filter)
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip((Math.max(Number(page) || 1, 1) - 1) * safeLimit)
      .limit(safeLimit)
    const total = await Product.countDocuments(filter)
    res.json({ success: true, products, total })
  } catch {
    res.status(500).json({ success: false, message: 'Could not load products' })
  }
})

router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' })
  }
  const product = await Product.findOne({ _id: req.params.id, isActive: true })
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' })
  res.json({ success: true, product })
})

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const product = await Product.create(req.body)
    res.status(201).json({ success: true, product })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' })
  }
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    })
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' })
    res.json({ success: true, product })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' })
  }
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' })
  res.json({ success: true, message: 'Product archived' })
})

export default router
