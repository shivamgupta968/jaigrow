import express from 'express'
import mongoose from 'mongoose'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

router.post('/', requireAuth, async (req, res) => {
  try {
    const { items, deliveryAddress, customerNote = '' } = req.body
    if (!Array.isArray(items) || items.length === 0 || !deliveryAddress?.trim()) {
      return res.status(400).json({ success: false, message: 'Items and delivery address are required' })
    }

    let subtotal = 0
    const verifiedItems = []

    for (const item of items) {
      if (!mongoose.isValidObjectId(item.productId) ||
          !mongoose.isValidObjectId(item.variantId) ||
          !Number.isInteger(item.quantity) || item.quantity < 1) {
        return res.status(400).json({ success: false, message: 'Invalid order item' })
      }

      const product = await Product.findOne({ _id: item.productId, isActive: true })
      const variant = product?.variants.id(item.variantId)
      if (!product || !variant || variant.price == null || variant.stock < item.quantity) {
        return res.status(400).json({ success: false, message: 'Product unavailable or insufficient stock' })
      }

      subtotal += variant.price * item.quantity
      verifiedItems.push({
        product: product._id,
        variantId: variant._id,
        name: product.name,
        packSize: variant.packSize,
        quantity: item.quantity,
        unitPrice: variant.price
      })
    }

    const order = await Order.create({
      orderNumber: `JG-${Date.now()}`,
      customer: req.user.id,
      items: verifiedItems,
      subtotal,
      total: subtotal,
      deliveryAddress: deliveryAddress.trim(),
      customerNote,
      paymentMethod: 'COD'
    })

    res.status(201).json({ success: true, order })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

router.get('/my-orders', requireAuth, async (req, res) => {
  const orders = await Order.find({ customer: req.user.id }).sort({ createdAt: -1 })
  res.json({ success: true, orders })
})

router.get('/admin/all', requireAuth, requireAdmin, async (req, res) => {
  const orders = await Order.find().populate('customer', 'name phone').sort({ createdAt: -1 })
  res.json({ success: true, orders })
})

router.patch('/admin/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const allowed = ['Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled']
  if (!allowed.includes(req.body.status)) {
    return res.status(400).json({ success: false, message: 'Invalid order status' })
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid order ID' })
  }
  const order = await Order.findByIdAndUpdate(
    req.params.id, { status: req.body.status }, { new: true, runValidators: true }
  )
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
  res.json({ success: true, order })
})

export default router
