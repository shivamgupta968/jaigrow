import mongoose from 'mongoose'

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    console.log('MongoDB URI not configured yet. Database connection pending.')
    return false
  }

  try {
    await mongoose.connect(uri)
    console.log('JaiGrow MongoDB connected successfully!')
    return true
  } catch (error) {
    console.error('MongoDB connection failed:', error.message)
    process.exit(1)
  }
}
