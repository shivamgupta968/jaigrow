import mongoose from 'mongoose'

const variantSchema = new mongoose.Schema({
  packSize: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true },
  price: { type: Number, min: 0, default: null },
  stock: { type: Number, min: 0, default: 0 },
  purchaseCost: { type: Number, min: 0, default: 0 }
}, { _id: true })

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  brand: { type: String, default: '' },
  company: { type: String, default: '' },
  category: {
    type: String,
    required: true,
    enum: ['Fertilizers', 'Seeds', 'Crop Care', 'Organic', 'Tools']
  },
  description: { type: String, default: '' },
  benefits: [String],
  usageInstructions: { type: String, default: '' },
  precautions: { type: String, default: '' },
  images: [String],
  variants: [variantSchema],
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false }
}, { timestamps: true })

export default mongoose.model('Product', productSchema)
