import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const router = express.Router()

router.post('/login', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim()
    const phone = String(req.body?.phone || '').replace(/\D/g, '')

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a name between 2 and 80 characters.'
      })
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number.'
      })
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      return res.status(500).json({
        success: false,
        message: 'Login service is not configured securely.'
      })
    }

    let user = await User.findOne({ phone })

    if (user?.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'This number cannot be used for customer login.'
      })
    }

    if (user && !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This customer account is inactive. Please contact JaiGrow.'
      })
    }

    if (user) {
      user.name = name
      await user.save()
    } else {
      user = await User.create({
        name,
        phone,
        role: 'customer'
      })
    }

    const token = jwt.sign(
      { id: user._id.toString(), role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Please try logging in again.'
      })
    }

    console.error('Customer login error:', error.message)
    return res.status(500).json({
      success: false,
      message: 'Unable to login right now. Please try again.'
    })
  }
})

export default router
