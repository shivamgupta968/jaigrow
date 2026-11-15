import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: 80
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: /^[6-9]\d{9}$/
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  passwordHash: {
    type: String,
    select: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true })

export default mongoose.model('User', userSchema)
