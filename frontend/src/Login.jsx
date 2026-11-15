import { useState } from 'react'
import axios from 'axios'

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '')
import { Sprout, Phone, User, ArrowRight, LoaderCircle } from 'lucide-react'
import './Login.css'

export default function Login({ onSuccess }) {
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setMessage('')

    const cleanName = name.trim()
    if (cleanName.length < 2) {
      setMessage('Please enter your full name.')
      return
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setMessage('Please enter a valid 10-digit mobile number.')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        { name: cleanName, phone: mobile }
      )

      const { token, user } = response.data || {}

      if (!token || !user) {
        throw new Error('Invalid login response from server.')
      }

      localStorage.setItem('jaigrow_token', token)
      localStorage.setItem('jaigrow_customer', JSON.stringify(user))
      onSuccess(user)
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        error.message ||
        'Login failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-overlay">
      <section className="login-panel">
        <div className="login-brand">
          <span><Sprout size={32}/></span>
          <h2>JaiGrow</h2>
          <small>AGRICULTURE STORE</small>
        </div>

        <div className="login-art">
          <div className="login-art-content">
            <Sprout size={35}/>
            <h3>Har Khet Ki Tarakki</h3>
            <p>Your farming journey, all in one place.</p>
          </div>
        </div>

        <div className="login-form-area">
          <span className="eyebrow">WELCOME TO JAIGROW</span>
          <h1>Welcome!</h1>
          <p>Enter your details to explore JaiGrow products and services.</p>

          <form onSubmit={handleLogin}>
            <label>Your name</label>
            <div className="login-input">
              <User size={18}/>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value.slice(0, 80))}
                placeholder="Enter your full name"
                autoComplete="name"
                maxLength={80}
                required
              />
            </div>

            <label style={{marginTop: 20}}>Mobile number</label>
            <div className="login-input">
              <Phone size={18}/>
              <span>+91</span>
              <input
                type="tel"
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10-digit number"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                required
              />
            </div>

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : 'Continue to JaiGrow'}
              {loading ? <LoaderCircle size={17}/> : <ArrowRight size={17}/>}
            </button>
          </form>

          {message && <div className="login-message" role="alert">{message}</div>}

          <div className="login-terms">
            No OTP or SMS verification is used. By continuing, you agree to JaiGrow's Terms & Privacy Policy. Use your own mobile number.
          </div>
        </div>
      </section>
    </div>
  )
}

