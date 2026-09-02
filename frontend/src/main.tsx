import React, { useEffect, useState, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import {
  api,
  errorText,
  session,
  type Customer,
  type DashboardData,
  type Product,
  type Role,
  type SalesChallan,
  type SalesOverviewPoint,
  type StockMovement
} from './api'
import '../app/globals.css'
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  Bell,
  Check,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Edit2,
  Eye,
  EyeOff,
  Home,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Warehouse,
  X
} from 'lucide-react'

type Module = 'Dashboard' | 'Customers' | 'Products' | 'Inventory' | 'Stock Movements' | 'Sales Challans'

const access: Record<Role, Module[]> = {
  ADMIN: ['Dashboard', 'Customers', 'Products', 'Inventory', 'Stock Movements', 'Sales Challans'],
  SALES: ['Dashboard', 'Customers', 'Sales Challans'],
  WAREHOUSE: ['Dashboard', 'Products', 'Inventory', 'Stock Movements'],
  ACCOUNTS: ['Dashboard', 'Customers']
}

const icons: Record<Module, React.ComponentType<{ size?: number }>> = {
  Dashboard: Home,
  Customers: Users,
  Products: Package,
  Inventory: Warehouse,
  'Stock Movements': Warehouse,
  'Sales Challans': Truck
}

function App() {
  const [user, setUser] = useState<{ id?: number; role?: Role; email?: string; name?: string } | null>(
    () => (session.token ? session.user : null)
  )
  const [module, setModule] = useState<Module>('Dashboard')
  const [mobile, setMobile] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const refreshStartTimeRef = useRef(0)

  const triggerRefresh = () => {
    if (refreshing) return
    refreshStartTimeRef.current = Date.now()
    setRefreshing(true)
    setRefresh(r => r + 1)
  }

  const handleRefreshEnd = () => {
    const elapsed = Date.now() - refreshStartTimeRef.current
    const remaining = Math.max(500 - elapsed, 0)
    if (remaining > 0) {
      setTimeout(() => {
        setRefreshing(false)
      }, remaining)
    } else {
      setRefreshing(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(t => (t?.message === message ? null : t)), 4000)
  }

  const logout = () => {
    session.setToken(null)
    session.setUser(null)
    setUser(null)
  }

  useEffect(() => {
    const onAuthExpired = () => {
      setUser(null)
      showToast('Your session has expired. Please sign in again.', 'error')
    }
    window.addEventListener('auth:expired', onAuthExpired)
    return () => window.removeEventListener('auth:expired', onAuthExpired)
  }, [])

  if (!user) {
    return <Login onLogin={u => { setUser(u); setModule('Dashboard'); }} />
  }

  const role = (user.role || 'ADMIN') as Role
  const modules = access[role] || access.ADMIN

  // Guard: if current module is not permitted for role, redirect to Dashboard
  const currentModule = modules.includes(module) ? module : 'Dashboard'

  return (
    <div className="erp-app">
      <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">F</div>
          <div>
            <strong>Fundsroom ERP</strong>
            <small>Operations Portal</small>
          </div>
          <button className="icon-button sidebar-close" onClick={() => setMobile(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="workspace">
          <span className="workspace-dot" />
          Live API · Role: <strong>{role}</strong>
        </div>
        <nav>
          {modules.map(m => {
            const Icon = icons[m] || Package
            return (
              <button
                key={m}
                className={`nav-item ${currentModule === m ? 'active' : ''}`}
                onClick={() => {
                  setModule(m)
                  setMobile(false)
                }}
              >
                <Icon size={18} />
                <span>{m}</span>
              </button>
            )
          })}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={logout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
          <div className="user-mini">
            <div className="avatar">
              {String(user.name || user.email || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>{user.name || user.email}</strong>
              <small>{role} · Active session</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMobile(true)}>
            <Menu size={20} />
          </button>
          <div className="crumb">
            <span>Operations</span>
            <strong>{currentModule}</strong>
          </div>
          <div className="top-actions">
            <button
              type="button"
              className={`button secondary refresh-btn ${refreshing ? 'is-refreshing' : ''}`}
              title="Refresh dashboard"
              aria-label="Refresh dashboard"
              disabled={refreshing}
              onClick={triggerRefresh}
            >
              <RefreshCw
                size={14}
                className={refreshing ? 'animate-spin-clockwise' : ''}
              />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        <div className="page-content">
          {currentModule === 'Dashboard' ? (
            <Dashboard onNavigate={setModule} refresh={refresh} userRole={role} onStockIn={triggerRefresh} notify={showToast} onRefreshEnd={handleRefreshEnd} />
          ) : currentModule === 'Customers' ? (
            <Customers refresh={refresh} notify={showToast} onUpdate={triggerRefresh} userRole={role} onRefreshEnd={handleRefreshEnd} />
          ) : currentModule === 'Products' ? (
            <Products refresh={refresh} notify={showToast} onUpdate={triggerRefresh} userRole={role} onRefreshEnd={handleRefreshEnd} />
          ) : currentModule === 'Inventory' ? (
            <Inventory refresh={refresh} notify={showToast} onUpdate={triggerRefresh} userRole={role} onRefreshEnd={handleRefreshEnd} />
          ) : currentModule === 'Stock Movements' ? (
            <Movements refresh={refresh} notify={showToast} onUpdate={triggerRefresh} userRole={role} onRefreshEnd={handleRefreshEnd} />
          ) : (
            <Challans refresh={refresh} notify={showToast} onUpdate={triggerRefresh} userRole={role} onRefreshEnd={handleRefreshEnd} />
          )}
        </div>
      </main>

      {toast && (
        <div
          className={`toast ${toast.type === 'error' ? 'error' : 'success'}`}
          onClick={() => setToast(null)}
          style={{ cursor: 'pointer' }}
        >
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}

function Login({ onLogin }: { onLogin: (u: any) => void }) {
  const [email, setEmail] = useState(() => localStorage.getItem('remember_email') || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem('remember_email')))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const result = await api.login(email.trim(), password)
      if (!result.token) throw new Error('Login response did not include a valid JWT token.')

      if (rememberMe) {
        localStorage.setItem('remember_email', email.trim())
      } else {
        localStorage.removeItem('remember_email')
      }

      session.setToken(result.token)
      session.setUser(result.user)
      onLogin(result.user)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-split-container">
      {/* Left Branding Side (~55%) */}
      <section className="login-brand-side">
        <div className="login-brand-bg" />
        <div className="login-brand-grid" />

        <div className="login-brand-content">
          {/* Top Brand & Version */}
          <div className="login-brand-top">
            <div className="login-brand-logo">
              <div className="logo-icon">F</div>
              <div className="logo-text">
                <strong>Fundsroom ERP</strong>
                <span>Enterprise Operations</span>
              </div>
            </div>
            <div className="login-badge-pill">
              <Sparkles size={13} />
              <span>v2.4 Enterprise</span>
            </div>
          </div>

          {/* Middle Value Proposition & Highlights */}
          <div className="login-brand-middle">
            <div className="login-hero-eyebrow">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa' }} />
              Operations & Inventory Platform
            </div>

            <h1 className="login-hero-heading">
              Smarter operations.<br />
              <span>Better control.</span>
            </h1>

            <p className="login-hero-subtext">
              Manage customers, sales, inventory and daily operations from one powerful platform.
            </p>

            {/* 3 Concise Feature Highlights */}
            <div className="login-features-list">
              <div className="login-feature-card">
                <div className="login-feature-icon">
                  <Warehouse size={18} />
                </div>
                <div>
                  <strong>Real-time Inventory</strong>
                  <p>Atomic stock movement tracking, threshold triggers, and streamlined Stock IN replenishment.</p>
                </div>
              </div>

              <div className="login-feature-card">
                <div className="login-feature-icon">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <strong>Role-based Access</strong>
                  <p>Strict role authorization tailored for Admin, Sales, Warehouse, and Accounts workflows.</p>
                </div>
              </div>

              <div className="login-feature-card">
                <div className="login-feature-icon">
                  <Truck size={18} />
                </div>
                <div>
                  <strong>Sales & Challan Management</strong>
                  <p>Draft-to-confirm dispatch pipeline with atomic stock deduction and snapshot integrity.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security / System Status */}
          <div className="login-brand-bottom">
            <span>© 2026 Fundsroom ERP. All rights reserved.</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={12} color="#60a5fa" />
              <span>256-bit Encrypted Session</span>
            </span>
          </div>
        </div>
      </section>

      {/* Right Form Side (~45%) */}
      <section className="login-form-side">
        <div className="login-card-container">
          {/* Mobile Header Logo */}
          <div className="login-mobile-brand">
            <div className="logo-icon">F</div>
            <div>
              <strong style={{ fontSize: 16, color: '#0f172a' }}>Fundsroom ERP</strong>
              <small style={{ display: 'block', fontSize: 11, color: '#64748b' }}>Operations Portal</small>
            </div>
          </div>

          {/* Form Header */}
          <div className="login-card-header">
            <h2>Welcome back</h2>
            <p>Sign in to your Fundsroom ERP account.</p>
          </div>

          {/* Inline Error Alert */}
          {error && (
            <div className="login-error-banner" role="alert">
              <AlertCircle size={18} />
              <div>
                <strong>Authentication failed</strong>
                <div style={{ fontSize: 12.5, marginTop: 2 }}>{error}</div>
              </div>
            </div>
          )}

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Email Field */}
            <div className="login-field">
              <label htmlFor="login-email">Email address</label>
              <div className="login-input-box">
                <Mail size={17} className="login-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="login-input"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-input-box">
                <Lock size={17} className="login-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="login-input has-toggle"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-eye-button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Security Hint */}
            <div className="login-options-row">
              <label className="login-remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span>Remember me</span>
              </label>
              <span className="login-sso-hint">Enterprise Portal</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="login-submit-button"
              disabled={loading || !email.trim() || !password}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin-fast" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

function formatInr(val: number): string {
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2).replace(/\.00$/, '')}L`
  }
  if (val >= 1000) {
    return `₹${(val / 1000).toFixed(1).replace(/\.0$/, '')}K`
  }
  return `₹${Math.round(val).toLocaleString('en-IN')}`
}

function formatExactInr(val: number): string {
  return `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function SalesChart({
  points,
  periodSales,
  loading
}: {
  points: SalesOverviewPoint[]
  periodSales: number
  loading?: boolean
}) {
  const [hovered, setHovered] = useState<SalesOverviewPoint | null>(null)

  if (loading) {
    return (
      <div className="chart" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={24} className="animate-spin-fast" style={{ color: '#98a2b3' }} />
        <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b' }}>Loading sales analytics…</span>
      </div>
    )
  }

  if (!points || points.length === 0 || periodSales === 0) {
    return (
      <div className="chart" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <BarChart2 size={30} style={{ color: '#98a2b3', opacity: 0.5, marginBottom: 6 }} />
        <strong style={{ color: '#475467', fontSize: 13 }}>No confirmed sales in this period</strong>
        <span className="muted" style={{ fontSize: 11, textAlign: 'center', maxWidth: 320, marginTop: 3 }}>
          Confirmed dispatch challans within this timeframe will appear here automatically.
        </span>
      </div>
    )
  }

  const maxVal = Math.max(...points.map(p => p.sales), 100)
  const yMax = maxVal * 1.15
  const width = 500
  const height = 135
  const padLeft = 8
  const padRight = 8
  const padTop = 15
  const padBottom = 15
  const innerW = width - padLeft - padRight
  const innerH = height - padTop - padBottom

  const coords = points.map((p, i) => {
    const x = padLeft + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2)
    const y = padTop + innerH - (p.sales / yMax) * innerH
    return { x, y, point: p }
  })

  // Build SVG path
  let pathD = `M ${coords[0].x} ${coords[0].y}`
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]
    const curr = coords[i]
    const cx = (prev.x + curr.x) / 2
    pathD += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`
  }

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`

  // 5 evenly spaced X-axis labels
  const step = Math.max(1, Math.floor(points.length / 5))
  const xLabels = points.filter((_, idx) => idx % step === 0 || idx === points.length - 1)

  return (
    <div className="chart" style={{ position: 'relative' }}>
      <div className="chart-y">
        <span>{formatInr(yMax)}</span>
        <span>{formatInr(yMax * 0.5)}</span>
        <span>₹0</span>
      </div>

      <div style={{ position: 'relative', width: '100%', height: 165 }}>
        {hovered && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 10,
              background: '#0f172a',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
              zIndex: 10,
              pointerEvents: 'none',
              display: 'flex',
              gap: 8,
              alignItems: 'center'
            }}
          >
            <span><strong>{hovered.label}</strong>:</span>
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>{formatExactInr(hovered.sales)}</span>
            <small style={{ color: '#94a3b8' }}>({hovered.orders} confirmed order{hovered.orders === 1 ? '' : 's'})</small>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          style={{ overflow: 'visible', width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3f83f8" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#3f83f8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <path d={areaD} fill="url(#salesGrad)" />
          <path
            d={pathD}
            fill="none"
            stroke="#3f83f8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={hovered?.date === c.point.date ? 5 : (c.point.sales > 0 ? 3.5 : 2)}
              fill={hovered?.date === c.point.date ? '#1d4ed8' : '#3f83f8'}
              stroke="#ffffff"
              strokeWidth={hovered?.date === c.point.date ? 2.5 : 1.5}
              style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={() => setHovered(c.point)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
      </div>

      <div className="chart-x">
        {xLabels.map((p, idx) => (
          <span key={idx}>{p.label}</span>
        ))}
      </div>
    </div>
  )
}

function Dashboard({
  onNavigate,
  refresh,
  userRole,
  onStockIn,
  notify,
  onRefreshEnd
}: {
  onNavigate: (m: Module) => void
  refresh: number
  userRole: Role
  onStockIn: () => void
  notify?: (msg: string, type?: 'success' | 'error') => void
  onRefreshEnd?: () => void
}) {
  const [stats, setStats] = useState<DashboardData | null>(null)
  const [challans, setChallans] = useState<SalesChallan[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D'>('7D')
  const [chartLoading, setChartLoading] = useState(false)

  const loadData = (daysCount: number) => {
    return Promise.all([
      api.dashboard(daysCount),
      api.challans(),
      api.movements(),
      api.products()
    ])
  }

  useEffect(() => {
    const isFirstLoad = !stats
    if (isFirstLoad) {
      setLoading(true)
      setError('')
    }
    const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : 90
    loadData(days)
      .then(([dashData, chList, movList, prodList]) => {
        if (dashData) {
          setStats(dashData)
        }
        setChallans(chList || [])
        setMovements(movList || [])
        setProducts(prodList || [])
      })
      .catch(e => {
        const msg = errorText(e)
        if (isFirstLoad) {
          setError(msg)
        } else {
          notify?.(`Failed to refresh dashboard: ${msg}`, 'error')
        }
      })
      .finally(() => {
        setLoading(false)
        onRefreshEnd?.()
      })
  }, [refresh])

  const handleTimeRangeChange = async (range: '7D' | '30D' | '90D') => {
    setTimeRange(range)
    const days = range === '7D' ? 7 : range === '30D' ? 30 : 90
    setChartLoading(true)
    try {
      const data = await api.dashboard(days)
      if (data) {
        setStats(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setChartLoading(false)
    }
  }

  if (error) {
    return (
      <div className="empty-state">
        <AlertTriangle size={32} color="#d92d20" />
        <strong>Dashboard unavailable</strong>
        <span>{error}</span>
      </div>
    )
  }

  if (loading && !stats) return <div className="loading-state">Loading live dashboard metrics…</div>

  const lowStockProducts = products.filter(p => p.currentStock <= p.minStock)
  const draftChallans = challans.filter(c => c.status === 'DRAFT')
  const openChallans = draftChallans.length || Math.max((stats?.challans || 0) - (stats?.confirmed || 0), 0)
  const lowStockCount = stats?.lowStock ?? lowStockProducts.length

  // Sort products for inventory snapshot: Out of stock first, then Low stock, then In stock
  const sortedInventory = [...products].sort((a, b) => {
    const aStatus = a.currentStock <= 0 ? 0 : a.currentStock <= a.minStock ? 1 : 2
    const bStatus = b.currentStock <= 0 ? 0 : b.currentStock <= b.minStock ? 1 : 2
    if (aStatus !== bStatus) return aStatus - bStatus
    return a.currentStock - b.currentStock
  })

  return (
    <>
      <div className="welcome">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Operations Dashboard</h1>
          <p className="muted">Authoritative metrics calculated directly from the PostgreSQL backend.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(userRole === 'ADMIN' || userRole === 'SALES') && (
            <button className="button primary" onClick={() => onNavigate('Sales Challans')}>
              <Plus size={16} />
              New Challan
            </button>
          )}
          {(userRole === 'ADMIN' || userRole === 'WAREHOUSE') && (
            <button className="button secondary" onClick={() => onNavigate('Inventory')}>
              <Warehouse size={16} />
              Stock IN
            </button>
          )}
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi
          label="Net Sales"
          value={stats?.netSales !== undefined ? formatExactInr(stats.netSales) : '—'}
          subtitle="Confirmed sales"
          icon={DollarSign}
          colorClass="blue"
        />
        <Kpi
          label="Open Challans"
          value={openChallans}
          subtitle={openChallans === 1 ? '1 draft challan' : `${openChallans} draft challans`}
          icon={Truck}
          colorClass="amber"
        />
        <Kpi
          label="Outstanding"
          value="—"
          subtitle="Not available"
          icon={CreditCard}
          colorClass="amber"
        />
        <Kpi
          label="Low Stock Items"
          value={lowStockCount}
          subtitle={lowStockCount > 0 ? `${lowStockCount} item${lowStockCount === 1 ? '' : 's'} below threshold` : 'All stock optimal'}
          icon={AlertTriangle}
          colorClass={lowStockCount > 0 ? 'red' : 'green'}
        />
      </div>

      {lowStockProducts.length > 0 && (
        <div className="panel" style={{ borderLeft: '4px solid #d92d20', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={20} color="#d92d20" />
              <div>
                <strong>{lowStockProducts.length} Product(s) at or below minimum threshold!</strong>
                <small className="muted" style={{ display: 'block' }}>Replenish inventory to prevent sales fulfillment disruption.</small>
              </div>
            </div>
            {(userRole === 'ADMIN' || userRole === 'WAREHOUSE') && (
              <button className="button primary" style={{ fontSize: 11, padding: '6px 12px' }} onClick={() => onNavigate('Inventory')}>
                Perform Stock IN
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upper Grid: Sales Overview Chart & Inventory Snapshot */}
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-header">
            <div>
              <h2>Sales Overview</h2>
              <div className="chart-legend" style={{ marginTop: 4 }}>
                <span><i className="dot blue" /> Daily confirmed sales ({timeRange})</span>
              </div>
            </div>
            <div className="range-tabs">
              {(['7D', '30D', '90D'] as const).map(tab => (
                <button
                  key={tab}
                  className={timeRange === tab ? 'selected' : ''}
                  onClick={() => handleTimeRangeChange(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <SalesChart
            points={stats?.salesOverview || []}
            periodSales={stats?.periodSales || 0}
            loading={chartLoading}
          />
        </section>

        <section className="panel">
          <SectionHeader title="Inventory Snapshot" onAction={() => onNavigate('Products')} action="View all" />
          <div className="inventory-list">
            {sortedInventory.slice(0, 4).map(p => {
              const isOut = p.currentStock <= 0
              const isLow = p.currentStock <= p.minStock
              const badgeClass = isOut ? 'status-red' : isLow ? 'status-amber' : 'status-green'
              const badgeText = isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'
              return (
                <div key={p.id} className="inventory-row">
                  <div className="product-icon">
                    <Package size={15} />
                  </div>
                  <div className="row-main">
                    <strong>{p.name}</strong>
                    <small>{p.sku} · Min: {p.minStock}</small>
                  </div>
                  <div className="stock-number">
                    <strong>{p.currentStock}</strong>
                    <small>units</small>
                  </div>
                  <span className={`status-badge ${badgeClass}`}>{badgeText}</span>
                </div>
              )
            })}
            {products.length === 0 && (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <Package size={24} />
                <span>No products recorded yet.</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Lower Grid: Recent Sales Challans & Recent Stock Movements */}
      <div className="dashboard-grid lower">
        <section className="panel">
          <SectionHeader title="Recent Sales Challans" onAction={() => onNavigate('Sales Challans')} action="View all" />
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Customer</th>
                  <th>Qty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {challans.slice(0, 5).map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.challanNumber || `#${c.id}`}</strong></td>
                    <td>{c.customer?.businessName || c.customer?.name || String(c.customerId)}</td>
                    <td>{c.totalQuantity}</td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
                {challans.length === 0 && (
                  <tr><td colSpan={4} className="muted" style={{ textAlign: 'center' }}>No challans recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <SectionHeader title="Recent Stock Movements" onAction={() => onNavigate('Stock Movements')} action="View audit log" />
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Movement</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 5).map(m => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.product?.name || `Product #${m.productId}`}</strong>
                      <small>{m.product?.sku || ''}</small>
                    </td>
                    <td>
                      <span className={`direction ${m.movementType === 'IN' ? 'in' : 'out'}`}>
                        {m.movementType === 'IN' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        {m.movementType} {m.quantity}
                      </span>
                    </td>
                    <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.reason}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr><td colSpan={3} className="muted" style={{ textAlign: 'center' }}>No movements recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}

function Kpi({
  label,
  value,
  subtitle,
  icon: Icon,
  colorClass
}: {
  label: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ size?: number }>
  colorClass: 'blue' | 'amber' | 'green' | 'red'
}) {
  return (
    <div className="kpi">
      <div className={`kpi-icon ${colorClass}`}>
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small className="muted">{subtitle || 'Backend verified'}</small>
      </div>
    </div>
  )
}

function SectionHeader({
  title,
  action,
  onAction
}: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {action && (
        <button className="button secondary" onClick={onAction} style={{ padding: '5px 10px', fontSize: 11 }}>
          {action}
        </button>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  let color = 'status-neutral'
  if (status === 'CONFIRMED' || status === 'ACTIVE') color = 'status-green'
  else if (status === 'DRAFT' || status === 'LEAD') color = 'status-amber'
  else if (status === 'CANCELLED' || status === 'INACTIVE') color = 'status-red'
  return <span className={`status-badge ${color}`}>{status}</span>
}

// ----------------------------------------------------
// CUSTOMERS MODULE
// ----------------------------------------------------
function Customers({
  refresh,
  notify,
  onUpdate,
  userRole,
  onRefreshEnd
}: {
  refresh: number
  notify: (s: string, type?: 'success' | 'error') => void
  onUpdate: () => void
  userRole: Role
  onRefreshEnd?: () => void
}) {
  const [rows, setRows] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'details' | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerDetails, setCustomerDetails] = useState<Customer | null>(null)

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    businessName: '',
    customerType: 'WHOLESALE' as 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR',
    status: 'LEAD' as 'LEAD' | 'ACTIVE' | 'INACTIVE',
    address: '',
    gstNumber: '',
    notes: '',
    followUpDate: ''
  })

  const canEdit = userRole === 'ADMIN' || userRole === 'SALES'

  const load = () => {
    setLoading(true)
    api.customers(search)
      .then(setRows)
      .catch(e => setError(errorText(e)))
      .finally(() => {
        setLoading(false)
        onRefreshEnd?.()
      })
  }

  useEffect(() => {
    const timer = setTimeout(load, search ? 250 : 0)
    return () => clearTimeout(timer)
  }, [search, refresh])

  const openAdd = () => {
    setForm({
      name: '',
      mobile: '',
      email: '',
      businessName: '',
      customerType: 'WHOLESALE',
      status: 'LEAD',
      address: '',
      gstNumber: '',
      notes: '',
      followUpDate: ''
    })
    setModalMode('add')
  }

  const openEdit = (c: Customer) => {
    setSelectedCustomer(c)
    setForm({
      name: c.name,
      mobile: c.mobile,
      email: c.email || '',
      businessName: c.businessName,
      customerType: c.customerType,
      status: c.status,
      address: c.address,
      gstNumber: c.gstNumber || '',
      notes: c.notes || '',
      followUpDate: c.followUpDate ? c.followUpDate.split('T')[0] : ''
    })
    setModalMode('edit')
  }

  const openDetails = async (c: Customer) => {
    setSelectedCustomer(c)
    setCustomerDetails(null)
    setModalMode('details')
    try {
      const full = await api.customer(c.id)
      setCustomerDetails(full)
    } catch {
      setCustomerDetails(c)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        businessName: form.businessName.trim(),
        customerType: form.customerType,
        status: form.status,
        address: form.address.trim(),
        email: form.email.trim(),
        gstNumber: form.gstNumber.trim(),
        notes: form.notes.trim(),
        followUpDate: form.followUpDate.trim()
      }
      if (modalMode === 'add') {
        const created = await api.createCustomer(payload)
        notify(`Customer "${created.name}" created successfully!`)
      } else if (modalMode === 'edit' && selectedCustomer) {
        await api.updateCustomer(selectedCustomer.id, payload)
        notify(`Customer "${payload.name}" updated successfully!`)
      }
      setModalMode(null)
      load()
      onUpdate()
    } catch (err) {
      notify(errorText(err), 'error')
    }
  }

  return (
    <>
      <div className="section-header">
        <div>
          <h2>Customers CRM</h2>
          <p className="muted">Manage client database, accounts, and contact points.</p>
        </div>
        {canEdit && (
          <button className="button primary" onClick={openAdd}>
            <Plus size={16} />
            Add Customer
          </button>
        )}
      </div>

      {modalMode && modalMode !== 'details' && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModalMode(null) }}>
          <div className="modal">
            <div className="modal-head">
              <h2>{modalMode === 'add' ? 'Add New Customer' : 'Edit Customer'}</h2>
              <button className="icon-button" onClick={() => setModalMode(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <label>
                  Full Name *
                  <input required placeholder="e.g. Rahul Sharma" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </label>
                <label>
                  Mobile Number *
                  <input required placeholder="10-15 digits" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} />
                </label>
                <label>
                  Business / Company Name *
                  <input required placeholder="e.g. Sharma Traders" value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} />
                </label>
                <label>
                  Email Address
                  <input type="email" placeholder="client@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </label>
                <label>
                  Customer Type *
                  <select value={form.customerType} onChange={e => setForm({ ...form, customerType: e.target.value as any })}>
                    <option value="WHOLESALE">WHOLESALE</option>
                    <option value="RETAIL">RETAIL</option>
                    <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                  </select>
                </label>
                <label>
                  Relationship Status *
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}>
                    <option value="LEAD">LEAD</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </label>
                <label>
                  GST Number
                  <input placeholder="22AAAAA0000A1Z5" value={form.gstNumber} onChange={e => setForm({ ...form, gstNumber: e.target.value })} />
                </label>
                <label>
                  Follow-up Date
                  <input type="date" value={form.followUpDate} onChange={e => setForm({ ...form, followUpDate: e.target.value })} />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Address *
                  <input required placeholder="Street, City, State, Pincode" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Notes & Details
                  <input placeholder="Optional internal notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </label>
              </div>
              <div className="modal-foot">
                <button type="button" className="button secondary" onClick={() => setModalMode(null)}>Cancel</button>
                <button type="submit" className="button primary">{modalMode === 'add' ? 'Create Customer' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalMode === 'details' && selectedCustomer && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModalMode(null) }}>
          <div className="modal wide">
            <div className="modal-head">
              <div>
                <h2>{selectedCustomer.businessName || selectedCustomer.name}</h2>
                <small className="muted">Customer ID #{selectedCustomer.id} · <StatusBadge status={selectedCustomer.status} /></small>
              </div>
              <button className="icon-button" onClick={() => setModalMode(null)}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18 }}>
              <div className="panel">
                <h3>Contact & Profile</h3>
                <div className="detail-rows">
                  <div><span>Contact Name:</span><strong>{selectedCustomer.name}</strong></div>
                  <div><span>Mobile:</span><strong>{selectedCustomer.mobile}</strong></div>
                  <div><span>Email:</span><strong>{selectedCustomer.email || '—'}</strong></div>
                  <div><span>Customer Type:</span><strong>{selectedCustomer.customerType}</strong></div>
                  <div><span>GST Number:</span><strong>{selectedCustomer.gstNumber || '—'}</strong></div>
                  <div><span>Address:</span><strong>{selectedCustomer.address}</strong></div>
                </div>
              </div>
              <div className="panel">
                <h3>Sales Challans History</h3>
                {customerDetails?.challans && customerDetails.challans.length > 0 ? (
                  <div className="table-scroll" style={{ maxHeight: 200 }}>
                    <table>
                      <thead><tr><th>Challan #</th><th>Qty</th><th>Status</th></tr></thead>
                      <tbody>
                        {customerDetails.challans.map(ch => (
                          <tr key={ch.id}>
                            <td><strong>{ch.challanNumber || `#${ch.id}`}</strong></td>
                            <td>{ch.totalQuantity}</td>
                            <td><StatusBadge status={ch.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="muted" style={{ padding: '20px 0', textAlign: 'center' }}>No challans recorded for this customer.</div>
                )}
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="button secondary" onClick={() => setModalMode(null)}>Close</button>
              {canEdit && (
                <button type="button" className="button primary" onClick={() => openEdit(selectedCustomer)}>
                  <Edit2 size={14} /> Edit Customer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="panel table-panel">
        <div className="table-toolbar">
          <label className="search-box">
            <Search size={16} />
            <input placeholder="Search by name, business, or mobile…" value={search} onChange={e => setSearch(e.target.value)} />
          </label>
        </div>
        {error ? (
          <div className="alert error">{error}</div>
        ) : loading && !rows.length ? (
          <div className="loading-state">Loading customers…</div>
        ) : !rows.length ? (
          <div className="empty-state">
            <Users size={32} />
            <strong>No customers found</strong>
            <span>{search ? 'Try adjusting your search query' : 'Create your first customer to get started.'}</span>
            {canEdit && !search && (
              <button className="button primary" onClick={openAdd} style={{ marginTop: 10 }}>Add Customer</button>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Address</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.businessName || c.name}</strong>
                      <small>#{c.id} · {c.name}</small>
                    </td>
                    <td>
                      {c.mobile}
                      <small>{c.email || '—'}</small>
                    </td>
                    <td>{c.customerType}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.address}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button className="button secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => openDetails(c)} title="View Details">
                          <Eye size={13} /> Details
                        </button>
                        {canEdit && (
                          <button className="button secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => openEdit(c)} title="Edit Customer">
                            <Edit2 size={13} /> Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

// ----------------------------------------------------
// PRODUCTS MODULE
// ----------------------------------------------------
function Products({
  refresh,
  notify,
  onUpdate,
  userRole,
  onRefreshEnd
}: {
  refresh: number
  notify: (s: string, type?: 'success' | 'error') => void
  onUpdate: () => void
  userRole: Role
  onRefreshEnd?: () => void
}) {
  const [rows, setRows] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'stockIn' | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Product Form
  const [prodForm, setProdForm] = useState({
    name: '',
    sku: '',
    category: '',
    unitPrice: '',
    currentStock: '0',
    minStock: '10',
    warehouse: 'Pune-01'
  })

  // Stock In Form
  const [stockInProductId, setStockInProductId] = useState<number | ''>('')
  const [stockInQty, setStockInQty] = useState<number | ''>('')
  const [stockInReason, setStockInReason] = useState('')

  const canManage = userRole === 'ADMIN' || userRole === 'WAREHOUSE'

  const load = () => {
    setLoading(true)
    api.products(search)
      .then(setRows)
      .catch(e => setError(errorText(e)))
      .finally(() => {
        setLoading(false)
        onRefreshEnd?.()
      })
  }

  useEffect(() => {
    const timer = setTimeout(load, search ? 250 : 0)
    return () => clearTimeout(timer)
  }, [search, refresh])

  const openAdd = () => {
    setProdForm({
      name: '',
      sku: `SKU-${Date.now().toString().slice(-4)}`,
      category: 'Electronics',
      unitPrice: '499',
      currentStock: '0',
      minStock: '10',
      warehouse: 'Pune-01'
    })
    setModalMode('add')
  }

  const openEdit = (p: Product) => {
    setSelectedProduct(p)
    setProdForm({
      name: p.name,
      sku: p.sku,
      category: p.category,
      unitPrice: String(p.unitPrice),
      currentStock: String(p.currentStock),
      minStock: String(p.minStock),
      warehouse: p.warehouse
    })
    setModalMode('edit')
  }

  const openStockIn = (p?: Product) => {
    if (p) {
      setStockInProductId(p.id)
    } else if (rows.length > 0) {
      setStockInProductId(rows[0].id)
    }
    setStockInQty('')
    setStockInReason('PO-2026 Restock Delivery')
    setModalMode('stockIn')
  }

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (modalMode === 'add') {
        const created = await api.createProduct(prodForm)
        notify(`Product "${created.name}" created with stock ${created.currentStock}!`)
      } else if (modalMode === 'edit' && selectedProduct) {
        await api.updateProduct(selectedProduct.id, prodForm)
        notify(`Product "${prodForm.name}" updated successfully!`)
      }
      setModalMode(null)
      load()
      onUpdate()
    } catch (err) {
      notify(errorText(err), 'error')
    }
  }

  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = Number(stockInQty)
    if (!stockInProductId || isNaN(qty) || qty <= 0 || !stockInReason.trim()) {
      notify('Please provide a valid product, quantity greater than 0, and reason.', 'error')
      return
    }

    try {
      await api.stockIn({
        productId: Number(stockInProductId),
        quantity: qty,
        reason: stockInReason.trim()
      })
      const targetProd = rows.find(p => p.id === Number(stockInProductId))
      notify(`Stock IN of ${qty} units recorded for ${targetProd?.name || 'Product'}!`)
      setModalMode(null)
      load()
      onUpdate()
    } catch (err) {
      notify(errorText(err), 'error')
    }
  }

  const targetProdForStockIn = rows.find(p => p.id === Number(stockInProductId))

  return (
    <>
      <div className="section-header">
        <div>
          <h2>Products & Inventory</h2>
          <p className="muted">Catalog inventory, live stock counts, and threshold monitoring.</p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="button secondary" onClick={() => openStockIn()}>
              <Warehouse size={16} />
              Stock IN
            </button>
            <button className="button primary" onClick={openAdd}>
              <Plus size={16} />
              Add Product
            </button>
          </div>
        )}
      </div>

      {/* Product Add / Edit Modal */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModalMode(null) }}>
          <div className="modal">
            <div className="modal-head">
              <h2>{modalMode === 'add' ? 'Create New Product' : 'Edit Product'}</h2>
              <button className="icon-button" onClick={() => setModalMode(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleProductSubmit}>
              <div className="form-grid">
                <label>
                  Product Name *
                  <input required placeholder="e.g. USB-C Charger" value={prodForm.name} onChange={e => setProdForm({ ...prodForm, name: e.target.value })} />
                </label>
                <label>
                  SKU (Unique) *
                  <input required placeholder="e.g. CHG-001" value={prodForm.sku} onChange={e => setProdForm({ ...prodForm, sku: e.target.value })} />
                </label>
                <label>
                  Category *
                  <input required placeholder="e.g. Electronics, Hardware" value={prodForm.category} onChange={e => setProdForm({ ...prodForm, category: e.target.value })} />
                </label>
                <label>
                  Unit Price (₹) *
                  <input type="number" min="0" step="0.01" required value={prodForm.unitPrice} onChange={e => setProdForm({ ...prodForm, unitPrice: e.target.value })} />
                </label>
                {modalMode === 'add' && (
                  <label>
                    Initial Stock Count
                    <input type="number" min="0" required value={prodForm.currentStock} onChange={e => setProdForm({ ...prodForm, currentStock: e.target.value })} />
                  </label>
                )}
                <label>
                  Minimum Stock Threshold *
                  <input type="number" min="0" required value={prodForm.minStock} onChange={e => setProdForm({ ...prodForm, minStock: e.target.value })} />
                </label>
                <label style={{ gridColumn: modalMode === 'add' ? 'auto' : '1 / -1' }}>
                  Warehouse Location *
                  <input required placeholder="e.g. Pune-01" value={prodForm.warehouse} onChange={e => setProdForm({ ...prodForm, warehouse: e.target.value })} />
                </label>
              </div>
              <div className="modal-foot">
                <button type="button" className="button secondary" onClick={() => setModalMode(null)}>Cancel</button>
                <button type="submit" className="button primary">{modalMode === 'add' ? 'Save Product' : 'Update Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock IN Modal */}
      {modalMode === 'stockIn' && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModalMode(null) }}>
          <div className="modal">
            <div className="modal-head">
              <h2>Record Stock IN (Inventory Replenishment)</h2>
              <button className="icon-button" onClick={() => setModalMode(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleStockInSubmit}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <label>
                  Movement Type (Authoritative)
                  <input disabled value="IN (Incoming / Addition to Product Stock)" style={{ background: '#e7f8ef', color: '#079455', fontWeight: 600 }} />
                </label>
                <label>
                  Select Product *
                  <select
                    required
                    value={stockInProductId}
                    onChange={e => setStockInProductId(Number(e.target.value))}
                  >
                    <option value="">Select a product…</option>
                    {rows.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — Current Stock: {p.currentStock}
                      </option>
                    ))}
                  </select>
                </label>

                {targetProdForStockIn && (
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Current Stock: <strong>{targetProdForStockIn.currentStock}</strong></span>
                    {Number(stockInQty) > 0 && (
                      <span style={{ color: '#079455' }}>
                        Projected Stock: <strong>{targetProdForStockIn.currentStock + Number(stockInQty)}</strong>
                      </span>
                    )}
                  </div>
                )}

                <label>
                  Quantity to Add * (Positive Integer)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="e.g. 50"
                    value={stockInQty}
                    onChange={e => setStockInQty(Number(e.target.value))}
                  />
                </label>
                <label>
                  Reason / Reference Note *
                  <input
                    required
                    placeholder="e.g. PO-2026-001, Supplier Batch A, Return Restock"
                    value={stockInReason}
                    onChange={e => setStockInReason(e.target.value)}
                  />
                </label>
              </div>
              <div className="modal-foot">
                <button type="button" className="button secondary" onClick={() => setModalMode(null)}>Cancel</button>
                <button type="submit" className="button primary">Submit Stock IN</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="panel table-panel">
        <div className="table-toolbar">
          <label className="search-box">
            <Search size={16} />
            <input placeholder="Search by product name or SKU…" value={search} onChange={e => setSearch(e.target.value)} />
          </label>
        </div>
        {error ? (
          <div className="alert error">{error}</div>
        ) : loading && !rows.length ? (
          <div className="loading-state">Loading products…</div>
        ) : !rows.length ? (
          <div className="empty-state">
            <Package size={32} />
            <strong>No products found</strong>
            <span>{search ? 'Try adjusting your search query.' : 'Add your first product to track inventory.'}</span>
            {canManage && !search && (
              <button className="button primary" onClick={openAdd} style={{ marginTop: 10 }}>Add Product</button>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Current Stock</th>
                  <th>Min Stock</th>
                  <th>Warehouse</th>
                  {canManage && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const isLow = p.currentStock <= p.minStock
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                        <small>#{p.id}</small>
                      </td>
                      <td><code>{p.sku}</code></td>
                      <td>{p.category || '—'}</td>
                      <td>₹{Number(p.unitPrice).toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong style={{ color: isLow ? '#d92d20' : '#1d2d48', fontSize: 13 }}>
                            {p.currentStock}
                          </strong>
                          {isLow && <span className="status-badge status-red">Low Stock</span>}
                        </div>
                      </td>
                      <td>{p.minStock}</td>
                      <td>{p.warehouse || '—'}</td>
                      {canManage && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button className="button secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => openStockIn(p)} title="Add Stock">
                              + Stock IN
                            </button>
                            <button className="button secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => openEdit(p)} title="Edit Product">
                              <Edit2 size={13} /> Edit
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

// ----------------------------------------------------
// INVENTORY MODULE (CURRENT STOCK OVERVIEW)
// ----------------------------------------------------
function Inventory({
  refresh,
  notify,
  onUpdate,
  userRole,
  onRefreshEnd
}: {
  refresh: number
  notify: (s: string, type?: 'success' | 'error') => void
  onUpdate: () => void
  userRole: Role
  onRefreshEnd?: () => void
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showStockIn, setShowStockIn] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('')
  const [stockQty, setStockQty] = useState<number | ''>('')
  const [reason, setReason] = useState('')

  const canManage = userRole === 'ADMIN' || userRole === 'WAREHOUSE'

  const load = () => {
    setLoading(true)
    api.products()
      .then(prods => {
        setProducts(prods || [])
        setError('')
      })
      .catch(e => setError(errorText(e)))
      .finally(() => {
        setLoading(false)
        onRefreshEnd?.()
      })
  }

  useEffect(() => {
    load()
  }, [refresh])

  const openStockIn = (p?: Product) => {
    if (p) {
      setSelectedProductId(p.id)
    } else if (products.length > 0) {
      setSelectedProductId(products[0].id)
    } else {
      setSelectedProductId('')
    }
    setStockQty('')
    setReason('PO Restock Delivery')
    setShowStockIn(true)
  }

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = Number(stockQty)
    if (!selectedProductId || isNaN(qty) || qty <= 0 || !reason.trim()) {
      notify('Please provide valid product, positive quantity, and reason.', 'error')
      return
    }

    try {
      await api.stockIn({
        productId: Number(selectedProductId),
        quantity: qty,
        reason: reason.trim()
      })
      const target = products.find(p => p.id === Number(selectedProductId))
      notify(`Stock IN of ${qty} units recorded for ${target?.name || 'Product'}!`)
      setShowStockIn(false)
      setSelectedProductId('')
      setStockQty('')
      setReason('')
      load()
      onUpdate()
    } catch (err) {
      notify(errorText(err), 'error')
    }
  }

  const selectedProdObj = products.find(p => p.id === Number(selectedProductId))

  // Authoritative KPI values computed from live products data
  const totalProducts = products.length
  const totalUnits = products.reduce((acc, p) => acc + (Number(p.currentStock) || 0), 0)
  const lowStock = products.filter(p => p.currentStock > 0 && p.currentStock <= p.minStock).length
  const outOfStock = products.filter(p => p.currentStock <= 0).length

  // Filtered rows for the inventory table
  const filteredProducts = products.filter(p => {
    if (statusFilter !== 'ALL') {
      const status = p.currentStock <= 0 ? 'OUT_OF_STOCK' : p.currentStock <= p.minStock ? 'LOW_STOCK' : 'IN_STOCK'
      if (status !== statusFilter) return false
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      const matchName = p.name?.toLowerCase().includes(q)
      const matchSku = p.sku?.toLowerCase().includes(q)
      const matchCat = p.category?.toLowerCase().includes(q)
      const matchWh = p.warehouse?.toLowerCase().includes(q)
      if (!matchName && !matchSku && !matchCat && !matchWh) return false
    }
    return true
  })

  return (
    <>
      <div className="section-header">
        <div>
          <h2>Inventory Overview</h2>
          <p className="muted">Current stock levels across warehouses.</p>
        </div>
        {canManage && (
          <button className="button primary" onClick={() => openStockIn()}>
            <Plus size={16} />
            Record Stock IN
          </button>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="kpi-grid">
        <Kpi
          label="Total Products"
          value={totalProducts}
          subtitle={totalProducts === 1 ? '1 SKU in catalog' : `${totalProducts} SKUs in catalog`}
          icon={Package}
          colorClass="blue"
        />
        <Kpi
          label="Total Units"
          value={totalUnits.toLocaleString('en-IN')}
          subtitle="Total units across warehouses"
          icon={Warehouse}
          colorClass="green"
        />
        <Kpi
          label="Low Stock"
          value={lowStock}
          subtitle={lowStock > 0 ? `${lowStock} item${lowStock === 1 ? '' : 's'} near threshold` : 'All stock optimal'}
          icon={AlertTriangle}
          colorClass={lowStock > 0 ? 'amber' : 'green'}
        />
        <Kpi
          label="Out of Stock"
          value={outOfStock}
          subtitle={outOfStock > 0 ? `${outOfStock} item${outOfStock === 1 ? '' : 's'} depleted` : 'Zero stockouts'}
          icon={AlertCircle}
          colorClass={outOfStock > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Stock IN Modal */}
      {showStockIn && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowStockIn(false) }}>
          <div className="modal">
            <div className="modal-head">
              <h2>Record Stock IN (Inventory Replenishment)</h2>
              <button className="icon-button" onClick={() => setShowStockIn(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleStockIn}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <label>
                  Movement Type (Authoritative)
                  <input disabled value="IN (Incoming / Addition to Product Stock)" style={{ background: '#e7f8ef', color: '#079455', fontWeight: 600 }} />
                </label>
                <label>
                  Select Product *
                  <select
                    required
                    value={selectedProductId}
                    onChange={e => setSelectedProductId(Number(e.target.value))}
                  >
                    <option value="">Select a product…</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — Current Stock: {p.currentStock}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedProdObj && (
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Current Stock: <strong>{selectedProdObj.currentStock}</strong></span>
                    {Number(stockQty) > 0 && (
                      <span style={{ color: '#079455' }}>
                        Projected Stock: <strong>{selectedProdObj.currentStock + Number(stockQty)}</strong>
                      </span>
                    )}
                  </div>
                )}

                <label>
                  Quantity to Add * (Positive Integer)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="e.g. 50"
                    value={stockQty}
                    onChange={e => setStockQty(Number(e.target.value))}
                  />
                </label>
                <label>
                  Reason / Reference Note *
                  <input
                    required
                    placeholder="e.g. PO-2026-001, Supplier Batch A, Return Restock"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                </label>
              </div>
              <div className="modal-foot">
                <button type="button" className="button secondary" onClick={() => setShowStockIn(false)}>Cancel</button>
                <button type="submit" className="button primary">Submit Stock IN</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Inventory Table */}
      <div className="panel table-panel">
        <div className="table-toolbar">
          <label className="search-box">
            <Search size={16} />
            <input
              placeholder="Search by product, SKU, category, or warehouse…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
          <div className="filter-wrap">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
              <option value="ALL">All Stock Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="alert error">{error}</div>
        ) : loading && !products.length ? (
          <div className="loading-state">Loading inventory…</div>
        ) : !filteredProducts.length ? (
          <div className="empty-state">
            <Warehouse size={32} />
            <strong>No inventory items found</strong>
            <span>{search || statusFilter !== 'ALL' ? 'Try adjusting your search or filter.' : 'No products available in the inventory catalog.'}</span>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Min Stock</th>
                  <th>Warehouse</th>
                  <th>Status</th>
                  {canManage && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const isOut = p.currentStock <= 0
                  const isLow = p.currentStock > 0 && p.currentStock <= p.minStock
                  const statusText = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'
                  const statusClass = isOut ? 'status-red' : isLow ? 'status-amber' : 'status-green'

                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                        <small>#{p.id}</small>
                      </td>
                      <td><code>{p.sku}</code></td>
                      <td>{p.category || '—'}</td>
                      <td>
                        <strong style={{ color: isOut ? '#d92d20' : isLow ? '#b54708' : '#1d2d48', fontSize: 13 }}>
                          {p.currentStock}
                        </strong>
                      </td>
                      <td>{p.minStock}</td>
                      <td>{p.warehouse || '—'}</td>
                      <td>
                        <span className={`status-badge ${statusClass}`}>
                          {statusText}
                        </span>
                      </td>
                      {canManage && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="button secondary"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => openStockIn(p)}
                            title="Record Stock IN"
                          >
                            + Stock IN
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

// ----------------------------------------------------
// STOCK MOVEMENTS MODULE (AUDIT HISTORY)
// ----------------------------------------------------
function Movements({
  refresh,
  notify,
  onUpdate,
  userRole,
  onRefreshEnd
}: {
  refresh: number
  notify: (s: string, type?: 'success' | 'error') => void
  onUpdate: () => void
  userRole: Role
  onRefreshEnd?: () => void
}) {
  const [rows, setRows] = useState<StockMovement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showStockIn, setShowStockIn] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('')
  const [stockQty, setStockQty] = useState<number | ''>('')
  const [reason, setReason] = useState('')

  const canManage = userRole === 'ADMIN' || userRole === 'WAREHOUSE'

  const load = () => {
    setLoading(true)
    Promise.all([api.movements(), api.products()])
      .then(([movs, prods]) => {
        setRows(movs)
        setProducts(prods)
      })
      .catch(e => setError(errorText(e)))
      .finally(() => {
        setLoading(false)
        onRefreshEnd?.()
      })
  }

  useEffect(() => {
    load()
  }, [refresh])

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = Number(stockQty)
    if (!selectedProductId || isNaN(qty) || qty <= 0 || !reason.trim()) {
      notify('Please provide valid product, positive quantity, and reason.', 'error')
      return
    }
    try {
      await api.stockIn({
        productId: Number(selectedProductId),
        quantity: qty,
        reason: reason.trim()
      })
      const target = products.find(p => p.id === Number(selectedProductId))
      notify(`Stock IN recorded successfully for ${target?.name || 'Product'}!`)
      setShowStockIn(false)
      setSelectedProductId('')
      setStockQty('')
      setReason('')
      load()
      onUpdate()
    } catch (err) {
      notify(errorText(err), 'error')
    }
  }

  const selectedProdObj = products.find(p => p.id === Number(selectedProductId))

  return (
    <>
      <div className="section-header">
        <div>
          <h2>Stock Movement Audit Log</h2>
          <p className="muted">Complete chronological trail of all IN and OUT inventory transactions.</p>
        </div>
        {canManage && (
          <button className="button primary" onClick={() => setShowStockIn(true)}>
            <Plus size={16} />
            Record Stock IN
          </button>
        )}
      </div>

      {showStockIn && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowStockIn(false) }}>
          <div className="modal">
            <div className="modal-head">
              <h2>Stock IN — Inventory Addition</h2>
              <button className="icon-button" onClick={() => setShowStockIn(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleStockIn}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <label>
                  Movement Type
                  <input disabled value="IN (Stock Increase)" style={{ background: '#e7f8ef', color: '#079455', fontWeight: 600 }} />
                </label>
                <label>
                  Select Product *
                  <select
                    required
                    value={selectedProductId}
                    onChange={e => setSelectedProductId(Number(e.target.value))}
                  >
                    <option value="">Select product to add stock to…</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — Current Stock: {p.currentStock}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedProdObj && (
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Current Stock: <strong>{selectedProdObj.currentStock}</strong></span>
                    {Number(stockQty) > 0 && (
                      <span style={{ color: '#079455' }}>
                        Projected New Stock: <strong>{selectedProdObj.currentStock + Number(stockQty)}</strong>
                      </span>
                    )}
                  </div>
                )}

                <label>
                  Quantity to Add * (Positive Integer)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="e.g. 100"
                    value={stockQty}
                    onChange={e => setStockQty(Number(e.target.value))}
                  />
                </label>
                <label>
                  Reason / Order Reference *
                  <input
                    required
                    placeholder="e.g. PO-1002 Supplier Delivery"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                </label>
              </div>
              <div className="modal-foot">
                <button type="button" className="button secondary" onClick={() => setShowStockIn(false)}>Cancel</button>
                <button type="submit" className="button primary">Submit Stock IN</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="panel table-panel">
        {error ? (
          <div className="alert error">{error}</div>
        ) : loading && !rows.length ? (
          <div className="loading-state">Loading stock movements…</div>
        ) : !rows.length ? (
          <div className="empty-state">
            <Warehouse size={32} />
            <strong>No stock movements recorded</strong>
            <span>Perform a Stock IN or confirm a Sales Challan to record stock movements.</span>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Movement Type</th>
                  <th>Quantity</th>
                  <th>Reason</th>
                  <th>Created By</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(m => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.product?.name || `Product #${m.productId}`}</strong>
                    </td>
                    <td><code>{m.product?.sku || '—'}</code></td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          background: m.movementType === 'IN' ? '#dcfce7' : '#fee2e2',
                          color: m.movementType === 'IN' ? '#15803d' : '#b91c1c'
                        }}
                      >
                        {m.movementType === 'IN' ? '↓ IN' : '↑ OUT'}
                      </span>
                    </td>
                    <td><strong>{m.quantity}</strong></td>
                    <td style={{ maxWidth: 220 }}>{m.reason}</td>
                    <td>{m.createdBy?.name ? `${m.createdBy.name} (${m.createdBy.role})` : '—'}</td>
                    <td>{m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

// ----------------------------------------------------
// SALES CHALLANS MODULE
// ----------------------------------------------------
function Challans({
  refresh,
  notify,
  onUpdate,
  userRole,
  onRefreshEnd
}: {
  refresh: number
  notify: (s: string, type?: 'success' | 'error') => void
  onUpdate: () => void
  userRole: Role
  onRefreshEnd?: () => void
}) {
  const [rows, setRows] = useState<SalesChallan[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'CONFIRMED' | 'CANCELLED'>('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('')
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({})
  const [viewChallan, setViewChallan] = useState<SalesChallan | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const canManage = userRole === 'ADMIN' || userRole === 'SALES'

  const load = () => {
    setLoading(true)
    Promise.all([api.challans(), api.customers(), api.products()])
      .then(([chList, custs, prods]) => {
        setRows(chList)
        setCustomers(custs)
        setProducts(prods)
      })
      .catch(e => setError(errorText(e)))
      .finally(() => {
        setLoading(false)
        onRefreshEnd?.()
      })
  }

  useEffect(() => {
    load()
  }, [refresh])

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    const items = Object.entries(selectedItems)
      .filter(([, q]) => Number(q) > 0)
      .map(([productId, quantity]) => ({ productId: Number(productId), quantity: Number(quantity) }))

    if (!selectedCustomerId) {
      notify('Please select a customer for the sales challan.', 'error')
      return
    }
    if (items.length === 0) {
      notify('Please select at least one product with quantity greater than 0.', 'error')
      return
    }

    try {
      const challan = await api.createChallan({
        customerId: Number(selectedCustomerId),
        items
      })
      notify(`Draft challan ${challan.challanNumber || '#' + challan.id} created! Stock is unchanged until confirmed.`)
      setShowCreate(false)
      setSelectedCustomerId('')
      setSelectedItems({})
      load()
      onUpdate()
    } catch (err) {
      notify(errorText(err), 'error')
    }
  }

  const handleConfirm = async (id: number) => {
    setActionLoading(id)
    try {
      await api.confirmChallan(id)
      notify(`Challan #${id} confirmed and stock deducted successfully!`)
      load()
      onUpdate()
    } catch (e) {
      notify(errorText(e), 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this draft challan?')) return
    setActionLoading(id)
    try {
      await api.cancelChallan(id)
      notify(`Challan #${id} cancelled.`)
      load()
      onUpdate()
    } catch (e) {
      notify(errorText(e), 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredRows = statusFilter === 'ALL' ? rows : rows.filter(c => c.status === statusFilter)
  const totalDraftQuantity = Object.values(selectedItems).reduce((sum, q) => sum + (Number(q) || 0), 0)

  return (
    <>
      <div className="section-header">
        <div>
          <h2>Sales Challans</h2>
          <p className="muted">Draft, verify stock availability, and confirm dispatch challans.</p>
        </div>
        {canManage && (
          <button className="button primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Create Draft Challan
          </button>
        )}
      </div>

      {/* Create Challan Modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="modal wide">
            <div className="modal-head">
              <div>
                <h2>New Sales Challan</h2>
                <small className="muted">Drafts reserve no inventory until confirmed by Sales/Admin.</small>
              </div>
              <button className="icon-button" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateDraft}>
              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 650 }}>
                  Select Customer *
                </label>
                <select
                  required
                  style={{ width: '100%', padding: 9, border: '1px solid #d7dee8', borderRadius: 6 }}
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(Number(e.target.value))}
                >
                  <option value="">Select customer…</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.businessName ? `${c.businessName} (${c.name})` : c.name} — {c.mobile}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong>Select Products & Quantities:</strong>
                  <small className="muted">Total Qty: <strong>{totalDraftQuantity}</strong></small>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
                  {products.map(p => {
                    const qty = selectedItems[p.id] || ''
                    const hasStock = p.currentStock > 0
                    return (
                      <div
                        key={p.id}
                        style={{
                          padding: 10,
                          border: Number(qty) > 0 ? '1px solid #155eef' : '1px solid #e2e8f0',
                          background: Number(qty) > 0 ? '#f0f6ff' : '#fff',
                          borderRadius: 8,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                          <strong style={{ fontSize: 12, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.name}</strong>
                          <small className="muted" style={{ fontSize: 11 }}>
                            {p.sku} · Available Stock: <b style={{ color: hasStock ? '#079455' : '#d92d20' }}>{p.currentStock}</b>
                          </small>
                        </div>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          style={{ width: 70, padding: 6, border: '1px solid #d7dee8', borderRadius: 4, textAlign: 'center' }}
                          value={qty}
                          onChange={e => setSelectedItems({ ...selectedItems, [p.id]: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="button secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="button primary" disabled={totalDraftQuantity === 0}>
                  Create Draft Challan ({totalDraftQuantity} items)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Items Modal */}
      {viewChallan && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setViewChallan(null) }}>
          <div className="modal">
            <div className="modal-head">
              <div>
                <h2>Challan {viewChallan.challanNumber || `#${viewChallan.id}`}</h2>
                <small className="muted">Customer: {viewChallan.customer?.businessName || viewChallan.customer?.name} · <StatusBadge status={viewChallan.status} /></small>
              </div>
              <button className="icon-button" onClick={() => setViewChallan(null)}><X size={18} /></button>
            </div>
            <div style={{ marginTop: 14 }}>
              <h4>Line Items:</h4>
              <div className="table-scroll" style={{ maxHeight: 220 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Unit Price Snapshot</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewChallan.items && viewChallan.items.length > 0 ? (
                      viewChallan.items.map((it, idx) => (
                        <tr key={idx}>
                          <td><strong>{it.productNameSnapshot || it.product?.name || `Product #${it.productId}`}</strong></td>
                          <td><code>{it.skuSnapshot || it.product?.sku || '—'}</code></td>
                          <td>₹{Number(it.unitPriceSnapshot || 0).toFixed(2)}</td>
                          <td><strong>{it.quantity}</strong></td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="muted" style={{ textAlign: 'center' }}>No item details available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="button secondary" onClick={() => setViewChallan(null)}>Close</button>
              {viewChallan.status === 'DRAFT' && canManage && (
                <button
                  type="button"
                  className="button primary"
                  onClick={() => { const id = viewChallan.id; setViewChallan(null); handleConfirm(id); }}
                >
                  <Check size={14} /> Confirm & Deduct Stock
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="panel table-panel">
        <div className="table-toolbar" style={{ justifyContent: 'space-between' }}>
          <div className="range-tabs">
            {(['ALL', 'DRAFT', 'CONFIRMED', 'CANCELLED'] as const).map(st => (
              <button
                key={st}
                className={statusFilter === st ? 'selected' : ''}
                onClick={() => setStatusFilter(st)}
              >
                {st} {st !== 'ALL' && `(${rows.filter(r => r.status === st).length})`}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="alert error">{error}</div>
        ) : loading && !rows.length ? (
          <div className="loading-state">Loading sales challans…</div>
        ) : !filteredRows.length ? (
          <div className="empty-state">
            <Truck size={32} />
            <strong>No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} challans found</strong>
            <span>Create a new sales challan to start the order dispatch workflow.</span>
            {canManage && (
              <button className="button primary" onClick={() => setShowCreate(true)} style={{ marginTop: 10 }}>
                Create Draft Challan
              </button>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Customer</th>
                  <th>Total Qty</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Created At</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(c => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.challanNumber || `#${c.id}`}</strong>
                    </td>
                    <td>
                      <strong>{c.customer?.businessName || c.customer?.name || String(c.customerId)}</strong>
                      <small>{c.customer?.mobile || ''}</small>
                    </td>
                    <td><strong>{c.totalQuantity}</strong> items</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>{c.createdBy?.name || '—'}</td>
                    <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <button className="button secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => setViewChallan(c)}>
                          <Eye size={13} /> View Items
                        </button>
                        {c.status === 'DRAFT' && canManage && (
                          <>
                            <button
                              className="button primary"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                              disabled={actionLoading === c.id}
                              onClick={() => handleConfirm(c.id)}
                            >
                              <Check size={13} /> {actionLoading === c.id ? 'Confirming…' : 'Confirm'}
                            </button>
                            <button
                              className="button danger"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                              disabled={actionLoading === c.id}
                              onClick={() => handleCancel(c.id)}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
