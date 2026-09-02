export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS'

export type Customer = {
  id: number
  name: string
  mobile: string
  email?: string | null
  businessName: string
  gstNumber?: string | null
  customerType: 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR'
  address: string
  status: 'LEAD' | 'ACTIVE' | 'INACTIVE'
  followUpDate?: string | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
  challans?: SalesChallan[]
}

export type Product = {
  id: number
  name: string
  sku: string
  category: string
  unitPrice: number | string
  currentStock: number
  minStock: number
  warehouse: string
  createdAt?: string
  updatedAt?: string
}

export type ProductInput = {
  name?: string
  sku?: string
  category?: string
  unitPrice?: number | string
  currentStock?: number | string
  minStock?: number | string
  warehouse?: string
}

export type StockMovement = {
  id: number
  productId: number
  quantity: number
  movementType: 'IN' | 'OUT'
  reason: string
  createdById?: number
  product?: Product
  createdBy?: { name: string; role: string }
  createdAt?: string
}

export type ChallanLine = {
  id?: number
  challanId?: number
  productId: number
  productNameSnapshot: string
  skuSnapshot: string
  unitPriceSnapshot: number | string
  quantity: number
  product?: Product
}

export type SalesChallan = {
  id: number
  challanNumber: string
  customerId: number
  totalQuantity: number
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED'
  customer?: Customer
  items?: ChallanLine[]
  createdBy?: { name: string; role: string }
  createdAt?: string
  updatedAt?: string
}

export type ApiError = Error & { status?: number; data?: any }

const base = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '')

let token = localStorage.getItem('token') || sessionStorage.getItem('erp_token')

export const session = {
  get token() {
    return token
  },
  setToken(value: string | null) {
    token = value
    if (value) {
      localStorage.setItem('token', value)
      sessionStorage.setItem('erp_token', value)
    } else {
      localStorage.removeItem('token')
      sessionStorage.removeItem('erp_token')
    }
  },
  get user(): { id?: number; role?: Role; email?: string; name?: string } | null {
    try {
      return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('erp_user') || 'null')
    } catch {
      return null
    }
  },
  setUser(value: unknown) {
    if (value) {
      localStorage.setItem('user', JSON.stringify(value))
      sessionStorage.setItem('erp_user', JSON.stringify(value))
    } else {
      localStorage.removeItem('user')
      sessionStorage.removeItem('erp_user')
    }
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(`${base}${path}`, { ...options, headers })
  } catch {
    throw Object.assign(
      new Error('Unable to reach backend. Ensure the server is running at ' + base),
      { status: 0 }
    ) as ApiError
  }

  if (response.status === 401 && !path.includes('/auth/login')) {
    session.setToken(null)
    session.setUser(null)
    window.dispatchEvent(new CustomEvent('auth:expired'))
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      body?.message ||
      body?.error ||
      body?.errors?.[0]?.message ||
      `Request failed with status ${response.status}`
    throw Object.assign(new Error(message), { status: response.status, data: body }) as ApiError
  }

  return body
}

export type SalesOverviewPoint = {
  date: string
  label: string
  sales: number
  orders: number
}

export type DashboardData = {
  customers: number
  products: number
  challans: number
  confirmed: number
  lowStock: number
  netSales: number
  periodDays?: number
  periodSales?: number
  salesOverview?: SalesOverviewPoint[]
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: number; role: Role; email: string; name: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  dashboard: (days = 7) =>
    request<DashboardData>(`/dashboard?days=${days}`),

  salesOverview: (days = 7) =>
    request<{ periodDays: number; periodSales: number; salesOverview: SalesOverviewPoint[] }>(
      `/dashboard/sales-overview?days=${days}`
    ),

  customers: (query = '') =>
    request<{ data: Customer[]; total: number } | Customer[]>(
      `/customers${query ? `?search=${encodeURIComponent(query)}` : ''}`
    ).then(res => (Array.isArray(res) ? res : res?.data ?? [])),

  customer: (id: string | number) => request<Customer>(`/customers/${id}`),

  createCustomer: (data: Partial<Customer>) => {
    const body: Record<string, any> = {
      name: data.name?.trim(),
      mobile: data.mobile?.trim(),
      businessName: data.businessName?.trim(),
      customerType: data.customerType || 'WHOLESALE',
      address: data.address?.trim(),
      status: data.status || 'LEAD'
    }
    if (data.email !== undefined) body.email = data.email ? data.email.trim() : ''
    if (data.gstNumber !== undefined) body.gstNumber = data.gstNumber ? data.gstNumber.trim() : ''
    if (data.notes !== undefined) body.notes = data.notes ? data.notes.trim() : ''
    if (data.followUpDate !== undefined) body.followUpDate = data.followUpDate ? data.followUpDate.trim() : ''

    return request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },

  updateCustomer: (id: string | number, data: Partial<Customer>) => {
    const body: Record<string, any> = {}
    if (data.name !== undefined) body.name = data.name.trim()
    if (data.mobile !== undefined) body.mobile = data.mobile.trim()
    if (data.businessName !== undefined) body.businessName = data.businessName.trim()
    if (data.customerType !== undefined) body.customerType = data.customerType
    if (data.status !== undefined) body.status = data.status
    if (data.address !== undefined) body.address = data.address.trim()
    if (data.email !== undefined) body.email = data.email ? data.email.trim() : ''
    if (data.gstNumber !== undefined) body.gstNumber = data.gstNumber ? data.gstNumber.trim() : ''
    if (data.notes !== undefined) body.notes = data.notes ? data.notes.trim() : ''
    if (data.followUpDate !== undefined) body.followUpDate = data.followUpDate ? data.followUpDate.trim() : ''

    return request<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
  },

  products: (query = '') =>
    request<Product[]>(`/products${query ? `?search=${encodeURIComponent(query)}` : ''}`),

  product: (id: string | number) => request<Product>(`/products/${id}`),

  createProduct: (data: ProductInput | Partial<Product>) =>
    request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        sku: data.sku,
        category: data.category,
        unitPrice: Number(data.unitPrice),
        currentStock: Number(data.currentStock || 0),
        minStock: Number(data.minStock || 0),
        warehouse: data.warehouse
      })
    }),

  updateProduct: (id: string | number, data: ProductInput | Partial<Product>) =>
    request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: data.name,
        sku: data.sku,
        category: data.category,
        unitPrice: data.unitPrice !== undefined ? Number(data.unitPrice) : undefined,
        currentStock: data.currentStock !== undefined ? Number(data.currentStock) : undefined,
        minStock: data.minStock !== undefined ? Number(data.minStock) : undefined,
        warehouse: data.warehouse
      })
    }),

  movements: () => request<StockMovement[]>('/inventory/movements'),

  stockIn: (data: { productId: number; quantity: number; reason: string; movementType?: 'IN' }) =>
    request<StockMovement>('/inventory/movements', {
      method: 'POST',
      body: JSON.stringify({
        productId: Number(data.productId),
        quantity: Number(data.quantity),
        movementType: 'IN',
        reason: data.reason.trim()
      })
    }),

  challans: () => request<SalesChallan[]>('/challans'),

  createChallan: (data: { customerId: number; items: { productId: number; quantity: number }[] }) =>
    request<SalesChallan>('/challans', {
      method: 'POST',
      body: JSON.stringify({
        customerId: Number(data.customerId),
        items: data.items.map(i => ({ productId: Number(i.productId), quantity: Number(i.quantity) }))
      })
    }),

  confirmChallan: (id: string | number) =>
    request<SalesChallan>(`/challans/${id}/confirm`, { method: 'PUT' }),

  cancelChallan: (id: string | number) =>
    request<SalesChallan>(`/challans/${id}/cancel`, { method: 'PUT' })
}

export const errorText = (error: unknown) => {
  const e = error as ApiError
  return e?.message || 'Unexpected error'
}
