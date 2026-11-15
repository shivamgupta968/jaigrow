import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '')
import Login from './Login.jsx'
import {
  ShoppingCart, Search, Heart, Menu, X, Sprout, Truck,
  ShieldCheck, Headphones, ArrowRight, Plus, Minus,
  Trash2, MessageCircle, Leaf, PackageCheck
} from 'lucide-react'

const categories = ['All', 'Fertilizers', 'Seeds', 'Crop Care', 'Organic', 'Tools']
const money = n => String.fromCharCode(8377) + Number(n).toLocaleString('en-IN')

function App() {
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [language, setLanguage] = useState('EN')
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(null)
  const [customer, setCustomer] = useState(() => {
    try {
      const saved = localStorage.getItem('jaigrow_customer')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productError, setProductError] = useState('')

  useEffect(() => {
    let active = true

    const loadProducts = async () => {
      setLoadingProducts(true)
      setProductError('')

      try {
        const response = await axios.get(`${API_BASE_URL}/api/products?limit=50`)
        const rows = Array.isArray(response.data?.products)
          ? response.data.products
          : []

        const normalized = rows.map(product => {
          const variants = Array.isArray(product.variants) ? product.variants : []
          const variant = variants.find(v => v.isActive !== false) || variants[0] || null
          const rawPrice = variant?.price
          const price = rawPrice === null || rawPrice === undefined
            ? null
            : Number(rawPrice)

          return {
            id: product._id,
            variantId: variant?._id || null,
            name: product.name || 'Unnamed product',
            category: product.category || 'Other',
            pack: variant?.packSize || 'Pack size on enquiry',
            price: price !== null && Number.isFinite(price) ? price : null,
            priceNote: price !== null && Number.isFinite(price)
              ? 'Price set by JaiGrow'
              : 'Get current price',
            image: product.images?.[0] || 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800',
            description: product.description || 'Contact JaiGrow for product details.'
          }
        })

        if (active) setProducts(normalized)
      } catch (error) {
        if (active) {
          setProductError(
            error.response?.data?.message ||
            'Products could not load. Please check the backend server.'
          )
        }
      } finally {
        if (active) setLoadingProducts(false)
      }
    }

    loadProducts()
    return () => { active = false }
  }, [])

  const filteredProducts = useMemo(() => products.filter(p =>
    (category === 'All' || p.category === category) &&
    (p.name + ' ' + p.category + ' ' + p.pack).toLowerCase().includes(search.toLowerCase())
  ), [category, search])

  const addToCart = product => {
    setCart(old => {
      const found = old.find(item => item.id === product.id)
      return found
        ? old.map(item => item.id === product.id ? {...item, qty: item.qty + 1} : item)
        : [...old, {...product, qty: 1}]
    })
    setCartOpen(true)
  }

  const changeQty = (id, amount) => setCart(old =>
    old.map(item => item.id === id ? {...item, qty: item.qty + amount} : item)
      .filter(item => item.qty > 0)
  )

  const removeItem = id => setCart(old => old.filter(item => item.id !== id))
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)
  const total = cart.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0)
  const enquiryItems = cart.filter(item => item.price === null)

  const sendWhatsAppOrder = () => {
    const customerName = customer?.name || 'Not provided'
    const customerPhone = customer?.phone || customer?.mobile || 'Not provided'
    const address = deliveryAddress.trim()
      ? deliveryAddress.trim()
      : 'Not provided — customer will share live location on WhatsApp'

    const lines = cart.length
      ? cart.map((item, index) =>
          `${index + 1}. ${item.name} (${item.pack}) | Quantity: ${item.qty} | ${item.price === null ? 'Price on enquiry' : money(item.price * item.qty)}`
        ).join('\n')
      : 'No products added yet.'

    const message = `Namaste JaiGrow! I want to contact your team.

CUSTOMER DETAILS
Name: ${customerName}
Mobile: ${customerPhone}
Delivery address: ${address}

CART DETAILS
${lines}

Indicative subtotal: ${money(total)}

Please confirm product availability, final prices and delivery charges.${deliveryAddress.trim() ? '' : '\nI will share my live location here on WhatsApp.'}`

    window.open(`https://wa.me/919839532365?text=${encodeURIComponent(message)}`, '_blank')
  }

  const placeOrder = async event => {
    event.preventDefault()
    setCheckoutError('')

    if (!customer) {
      setCheckoutError('Please login before placing your order.')
      return
    }

    if (cart.length === 0) {
      setCheckoutError('Your cart is empty.')
      return
    }

    if (enquiryItems.length > 0) {
      setCheckoutError('Some products need price confirmation. Please use WhatsApp enquiry or remove those products.')
      return
    }

    if (cart.some(item => !item.variantId)) {
      setCheckoutError('A product variant is unavailable. Please contact JaiGrow.')
      return
    }

    const token = localStorage.getItem('jaigrow_token')
    if (!token) {
      setCheckoutError('Your login session is missing. Please login again.')
      return
    }

    setOrderSubmitting(true)

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/orders`,
        {
          items: cart.map(item => ({
            productId: item.id,
            variantId: item.variantId,
            quantity: item.qty
          })),
          deliveryAddress: deliveryAddress.trim(),
          customerNote: customerNote.trim()
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!response.data?.success || !response.data?.order) {
        throw new Error('Order confirmation was not received.')
      }

      setOrderSuccess(response.data.order)
      setCart([])
      setCheckoutError('')
    } catch (error) {
      setCheckoutError(
        error.response?.data?.message ||
        error.message ||
        'Unable to place your order. Please try again.'
      )
    } finally {
      setOrderSubmitting(false)
    }
  }
  return (
    <div className="site">
      <div className="announcement">✦ &nbsp; JAI GROW · HAR KHET KI TARAKKI &nbsp; ✦</div>

      <header className="header">
        <a className="brand" href="#home">
          <span className="brand-icon"><Sprout size={27}/></span>
          <span>JaiGrow<small>AGRICULTURE STORE</small></span>
        </a>
        <nav className={menuOpen ? 'nav open' : 'nav'}>
          <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#categories" onClick={() => setMenuOpen(false)}>Categories</a>
          <a href="#products" onClick={() => setMenuOpen(false)}>Products</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
        <div className="header-actions">
          <button className="language" onClick={() => setLanguage(language === 'EN' ? 'HI' : 'EN')}>{language}</button>
          {customer ? (
            <button className="login-button" onClick={() => {
              localStorage.removeItem('jaigrow_token')
              localStorage.removeItem('jaigrow_customer')
              setCustomer(null)
            }}>Logout · {customer.name}</button>
          ) : (
            <span className="login-button">Login required</span>
          )}
          <button type="button" className="header-whatsapp" onClick={sendWhatsAppOrder} aria-label="Contact JaiGrow on WhatsApp">
            <MessageCircle size={21}/>
          </button>          <button className="cart-button" onClick={() => setCartOpen(true)}>
            <ShoppingCart size={20}/><span>{cartCount}</span>
          </button>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X/> : <Menu/>}
          </button>
        </div>
      </header>

      <main>
        <section className="hero-banner" id="home">
          <a href="#products" aria-label="Explore JaiGrow products">
            <img
              src="/jaigrow-hero.png"
              alt="JaiGrow agriculture store — quality agricultural products and farming essentials"
            />
          </a>
        </section>

        <section className="benefits">
          <div><Truck/><span><b>Uttar Pradesh Delivery</b><small>Delivery across Uttar Pradesh</small></span></div>
          <div><ShieldCheck/><span><b>Quality Focused</b><small>Product details and enquiry support</small></span></div>
          <div><Headphones/><span><b>Personal Support</b><small>Talk directly to our team</small></span></div>
        </section>

        <section className="section" id="categories">
          <div className="section-heading">
            <span className="eyebrow">SHOP BY CATEGORY</span>
            <h2>Everything your farm needs</h2>
            <p>Explore agricultural essentials in one place.</p>
          </div>
          <div className="category-grid">
            {categories.slice(1).map((item, i) =>
              <button key={item} className="category-card" onClick={() => {
                setCategory(item)
                document.getElementById('products').scrollIntoView({behavior:'smooth'})
              }}>
                <span className="category-number">0{i+1}</span>
                <h3>{item}</h3><span className="category-arrow"><ArrowRight/></span>
              </button>
            )}
          </div>
        </section>

        <section className="section products-section" id="products">
          <div className="section-heading">
            <span className="eyebrow">THE JAI GROW COLLECTION</span>
            <h2>Products for every growing season</h2>
            <p>Explore products, compare pack sizes and add items to your enquiry cart.</p>
          </div>

          <div className="product-tools">
            <div className="search-box"><Search size={18}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, category or pack size..."/>
            </div>
            <div className="filters">
              {categories.map(c =>
                <button key={c} className={category === c ? 'filter active' : 'filter'} onClick={() => setCategory(c)}>{c}</button>
              )}
            </div>
          </div>

          <div className="product-grid">
            {filteredProducts.map(p =>
              <article className="product-card" key={p.id}>
                <div className="product-image">
                  <img src={p.image} alt={p.name} loading="lazy"
                    onError={e => {e.currentTarget.src='https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800'}}/>
                  <span className="product-tag">{p.category}</span>
                  <button className="wishlist" aria-label="Add to wishlist" onClick={() =>
                    setWishlist(old => old.includes(p.id) ? old.filter(x => x !== p.id) : [...old, p.id])
                  }><Heart size={19} fill={wishlist.includes(p.id) ? '#b87942' : 'none'} color={wishlist.includes(p.id) ? '#b87942' : '#173c2b'}/></button>
                </div>
                <div className="product-info">
                  <small>{p.pack}</small>
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <div className="price-line">
                    <b>{p.price === null ? 'Get Price' : money(p.price)}</b>
                    <span>{p.priceNote}</span>
                  </div>
                  <button className="add-button" onClick={() => addToCart(p)}>
                    <ShoppingCart size={16}/> Add to cart
                  </button>
                </div>
              </article>
            )}
            {loadingProducts && <p>Loading JaiGrow products...</p>}
            {!loadingProducts && productError && <p>{productError}</p>}
            {!loadingProducts && !productError && filteredProducts.length === 0 && (
              <p>{search || category !== 'All'
                ? 'No matching products found.'
                : 'Products are being added to JaiGrow. Please check again soon.'}</p>
            )}
          </div>
          <p className="price-disclaimer">Prices shown are reference estimates, not confirmed JaiGrow selling prices. Final price, brand, stock and delivery charges will be confirmed by the shop. Product images are illustrative.</p>
        </section>

        <section className="about-section" id="about">
          <div className="about-mark"><Sprout size={55}/></div>
          <div><span className="eyebrow">ROOTED IN TRUST</span>
            <h2>Growing together with our farmers.</h2>
            <p>JaiGrow helps farmers discover agricultural essentials with helpful service and a convenient enquiry experience.</p>
            <a href="#contact" className="text-link">Get in touch <ArrowRight size={17}/></a>
          </div>
        </section>

        <section className="contact-section" id="contact">
          <span className="eyebrow">WE'RE HERE TO HELP</span>
          <h2>Let's grow something great.</h2>
          <p>Have a product enquiry or need assistance? Talk to our team.</p>
          <button type="button" className="primary-button" onClick={sendWhatsAppOrder}>
            <MessageCircle size={18}/> Chat on WhatsApp <ArrowRight size={18}/>
          </button>
          <p className="contact-phone">9839532365 · 9919136715</p>
          <p>Bibiganj Bazaar, Main Market, Near Union Bank, Jaunpur, Uttar Pradesh – 222101</p>
          <a
  className="shop-location-link"
  href="https://www.google.com/maps/place/SONU+TRAVELS/@26.1623595,82.6630094,20z/data=!3m1!1e3"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Find JaiGrow shop on Google Maps"
  title="Find our shop on Google Maps"
>
  <span aria-hidden="true">📍</span>
  <span>Find our shop</span>
</a>
        <p>Open daily · 9 AM – 8 PM</p>
        </section>
        <section className="bottom-promo-banner" aria-label="JaiGrow agriculture promotion">
          <img
            src="/jaigrow-bottom.png"
            alt="JaiGrow — supporting farmers and better agriculture"
            loading="lazy"
          />
        </section>

        <section className="farmer-motivation">
          <span className="eyebrow">A MESSAGE FROM JAIGROW</span>
          <h2>आपकी मेहनत, आपके खेत की पहचान।</h2>
          <p>हर बीज में एक उम्मीद है, हर फसल में एक सपना। आपकी तरक्की की इस यात्रा में JaiGrow हमेशा आपके साथ है।</p>
          <strong>खुशहाल किसान, समृद्ध खेत और उज्ज्वल भविष्य — यही हमारा संकल्प है।</strong>
        </section>
      </main>

      <footer className="footer">
        <a className="brand" href="#home"><span className="brand-icon"><Sprout/></span><span>JaiGrow<small>AGRICULTURE STORE</small></span></a>
        <p>हर खेत की तरक्की</p>
        <small>© {new Date().getFullYear()} JaiGrow. All rights reserved.</small>
      </footer>

      <button className="floating-whatsapp" onClick={sendWhatsAppOrder}>
        <MessageCircle size={18}/> WhatsApp
      </button>

      {!customer && <Login onSuccess={setCustomer} />}
      {cartOpen && <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>
        <aside className="cart-drawer" onClick={e => e.stopPropagation()}>
          <div className="drawer-head">
            <div><span className="eyebrow">YOUR SELECTION</span><h2>Shopping Cart ({cartCount})</h2></div>
            <button className="close-drawer" onClick={() => setCartOpen(false)}><X/></button>
          </div>

          {cart.length === 0 ? <div className="empty-cart">
            <ShoppingCart size={45}/><h3>Your cart is empty</h3>
            <p>Explore products and add items to your cart.</p>
            <button className="primary-button" onClick={() => {setCartOpen(false);document.getElementById('products').scrollIntoView({behavior:'smooth'})}}>Explore Products</button>
          </div> : <>
            <div className="cart-items">
              {cart.map(item => <div className="cart-item" key={item.id}>
                <img src={item.image} alt={item.name}/>
                <div className="cart-item-info">
                  <b>{item.name}</b><small>{item.pack}</small>
                  <strong>{item.price === null ? 'Price on enquiry' : money(item.price)}</strong>
                  <div className="quantity">
                    <button onClick={() => changeQty(item.id,-1)}><Minus size={14}/></button>
                    <span>{item.qty}</span>
                    <button onClick={() => changeQty(item.id,1)}><Plus size={14}/></button>
                    <button className="remove-item" onClick={() => removeItem(item.id)}><Trash2 size={15}/></button>
                  </div>
                </div>
              </div>)}
            </div>
            <div className="cart-total">
              <div><span>Indicative subtotal</span><b>{money(total)}</b></div>
              {enquiryItems.length > 0 && <p>{enquiryItems.length} item(s) need price confirmation.</p>}
              <small>Delivery charges and final prices are confirmed by JaiGrow before order acceptance.</small>
              <button className="checkout-button" disabled={enquiryItems.length > 0} onClick={() => {
                setCartOpen(false)
                setCheckoutError('')
                setOrderSuccess(null)
                setCheckoutOpen(true)
              }}><PackageCheck size={18}/> Proceed to Checkout</button>
              {enquiryItems.length > 0 && <small className="checkout-hint">Remove products with unconfirmed prices to place a website order.</small>}
              <button className="whatsapp-enquiry-button" onClick={sendWhatsAppOrder}><MessageCircle size={18}/> WhatsApp Enquiry</button>
              <button className="continue-button" onClick={() => setCartOpen(false)}>Continue shopping</button>
              <button className="clear-cart" onClick={() => setCart([])}>Clear cart</button>
            </div>
          </>}
        </aside>
      </div>}
      {checkoutOpen && <div className="checkout-backdrop">
        <section className="checkout-panel">
          <div className="checkout-heading">
            <div>
              <span className="eyebrow">J A I G R O W · CHECKOUT</span>
              <h2>{orderSuccess ? 'Order Confirmed!' : 'Complete Your Order'}</h2>
            </div>
            <button className="close-drawer" onClick={() => {
              setCheckoutOpen(false)
              setOrderSuccess(null)
            }} aria-label="Close checkout"><X/></button>
          </div>

          {orderSuccess ? <div className="order-success">
            <PackageCheck size={58}/>
            <h3>Thank you, {customer?.name || 'Customer'}!</h3>
            <p>Your order has been successfully submitted to JaiGrow.</p>
            <div className="order-number">
              <small>YOUR ORDER NUMBER</small>
              <strong>{orderSuccess.orderNumber}</strong>
            </div>
            <p>Total: <b>{money(orderSuccess.total)}</b></p>
            <p>Payment: Cash on Delivery</p>
            <p>Current status: {orderSuccess.status}</p>
            <button className="checkout-button" onClick={() => {
              setCheckoutOpen(false)
              setOrderSuccess(null)
            }}>Continue Shopping</button>
          </div> : <form className="checkout-form" onSubmit={placeOrder}>
            <div className="checkout-customer">
              <h3>Customer details</h3>
              <p><b>{customer?.name}</b></p>
              <p>Mobile: {customer?.phone}</p>
            </div>

            <label htmlFor="delivery-address">Complete delivery address *</label>
            <textarea
              id="delivery-address"
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              placeholder="House number, village, post office, district, state and PIN code"
              rows={4}
              maxLength={500}
              required
            />

            <label htmlFor="customer-note">Landmark or delivery instructions (optional)</label>
            <textarea
              id="customer-note"
              value={customerNote}
              onChange={e => setCustomerNote(e.target.value)}
              placeholder="Nearby landmark or other delivery instructions"
              rows={2}
              maxLength={500}
            />

            <div className="checkout-summary">
              <h3>Order Summary</h3>
              {cart.map(item => <div className="checkout-summary-row" key={item.id}>
                <span>{item.name} ({item.pack}) × {item.qty}</span>
                <b>{money(item.price * item.qty)}</b>
              </div>)}
              <div className="checkout-summary-row">
                <span>Subtotal</span><b>{money(total)}</b>
              </div>
              <div className="checkout-summary-row">
                <span>Delivery</span><b>FREE</b>
              </div>
              <div className="checkout-grand-total">
                <span>Total payable</span><strong>{money(total)}</strong>
              </div>
            </div>

            <div className="payment-choice">
              <b>Payment method</b>
              <span><PackageCheck size={19}/> Cash on Delivery (COD)</span>
              <small>Pay when your order is delivered. JaiGrow will confirm your order before dispatch.</small>
            </div>

            {checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}

            <button className="checkout-button" type="submit" disabled={orderSubmitting || cart.length === 0}>
              {orderSubmitting ? 'Placing your order...' : 'Place Order · Cash on Delivery'}
            </button>
            <button className="continue-button" type="button" disabled={orderSubmitting} onClick={() => {
              setCheckoutOpen(false)
              setCartOpen(true)
            }}>Back to Cart</button>
          </form>}
        </section>
      </div>}
    </div>
  )
}

export default App












