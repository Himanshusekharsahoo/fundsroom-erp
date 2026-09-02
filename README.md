# Fundsroom ERP — Mini ERP + CRM Operations Portal

A full-stack **ERP + CRM Operations Portal** developed as part of the **Fundsroom Infotech Pvt. Ltd. Fullstack Developer Case Study**.

The application manages customers, products, inventory, stock movements, and sales challans with **role-based access control, JWT authentication, REST APIs, PostgreSQL, and backend-enforced inventory business logic**.

---

## 🚀 Project Overview

Fundsroom ERP is designed for a wholesale/distribution business where internal teams such as **Sales, Warehouse, Accounts, and Admin** need to manage day-to-day operations.

The application demonstrates a complete full-stack workflow:

```text
React + TypeScript Frontend
          │
          │ REST API + JWT
          ▼
Node.js + Express + TypeScript
          │
          │ Prisma ORM
          ▼
PostgreSQL Database
```

The main focus of the project is implementing realistic business workflows rather than only creating a UI.

---

# ✨ Key Features

## 🔐 Authentication & Role-Based Access

The system supports four user roles:

- Admin
- Sales
- Warehouse
- Accounts

Authentication is implemented using **JWT**.

The backend validates authentication and user roles before allowing protected operations.

---

## 👥 Customer CRM

The Customer module provides:

- Add customer
- Edit customer
- Search customers
- View customer information
- Customer name
- Mobile number
- Email
- Business name
- GST number
- Customer type
- Address
- Customer status
- Follow-up date
- Notes

### Customer Types

- Retail
- Wholesale
- Distributor

### Customer Status

- Lead
- Active
- Inactive

---

## 📦 Product Management

The Product module manages:

- Product name
- SKU / Product code
- Category
- Unit price
- Current stock
- Minimum stock threshold
- Warehouse / location

Supported operations:

- Add product
- Edit product
- Search products
- View stock status
- Identify low-stock products
- Identify out-of-stock products

---

# 📊 Inventory Management

The Inventory module provides a **current stock overview**.

It includes:

- Total products
- Total units
- Low-stock products
- Out-of-stock products
- Current stock
- Minimum stock level
- Warehouse
- Product search
- Status filtering
- Stock IN operation

### Stock Status

```text
Current Stock > Minimum Stock
        ↓
     IN STOCK

Current Stock > 0
AND
Current Stock <= Minimum Stock
        ↓
    LOW STOCK

Current Stock <= 0
        ↓
   OUT OF STOCK
```

Inventory displays the **current state of stock**.

---

# 🔄 Stock Movements

The Stock Movements module provides a chronological audit trail of inventory transactions.

Each movement records:

- Product
- SKU
- Quantity
- Movement type
- Reason
- Created by
- Timestamp

Supported movement types:

```text
IN
OUT
```

Example:

```text
Product: Wireless Mouse
SKU: MOU-001
Type: IN
Quantity: 5
Reason: Warehouse Stock Replenishment
Created By: Warehouse User
```

### Inventory vs Stock Movements

These modules have different responsibilities:

```text
Inventory
    ↓
Current stock position

Stock Movements
    ↓
Historical transaction / audit trail
```

---

# 🧾 Sales Challans

The Sales Challan module supports:

- Create sales challan
- Select customer
- Add multiple products
- Add product quantities
- Automatic challan number
- Save as Draft
- Confirm challan
- Cancel challan
- Product price snapshot
- Stock validation
- Automatic stock deduction
- Automatic OUT movement

---

# 🛡️ Stock Safety & Business Logic

Stock validation is performed by the **backend**, not only by the frontend.

When a challan is confirmed:

```text
Create Challan
      │
      ▼
    DRAFT
      │
      ▼
Confirm Challan
      │
      ▼
Validate Available Stock
      │
      ├───────────────┐
      │               │
      ▼               ▼
Insufficient       Sufficient
  Stock              Stock
      │               │
      ▼               ▼
Return Error       Confirm
                      │
                      ▼
                Deduct Stock
                      │
                      ▼
              Create OUT Movement
```

### Important Rules

- Creating a draft challan does **not** reduce stock.
- Stock is reduced only after successful confirmation.
- Stock cannot become negative.
- Insufficient stock results in an API error.
- A failed confirmation does not create an invalid OUT movement.
- Confirmed sales create corresponding stock OUT movements.

Example:

```text
Available Stock: 80
Requested Quantity: 81

Result:
Confirmation rejected
Stock remains unchanged
Challan remains Draft
```

---

# 💰 Sales Calculation

The dashboard calculates confirmed sales using the product price stored in the challan item snapshot.

```text
Net Sales
    =
Σ (Confirmed Quantity × Unit Price Snapshot)
```

Draft and cancelled challans are not included in confirmed sales.

---

# 📈 Operations Dashboard

The dashboard provides an operational overview of the system.

It includes:

- Net Sales
- Open Challans
- Outstanding information
- Low Stock Items
- Sales Overview
- Inventory Snapshot
- Recent Stock Movements
- Recent Sales Challans

The Sales Overview supports:

- 7 Days
- 30 Days
- 90 Days

Dashboard data is retrieved from the backend rather than being hardcoded in the frontend.

---

# 🔄 Dashboard Refresh

The dashboard includes a manual **Refresh** action.

When the user clicks Refresh:

```text
User clicks Refresh
        ↓
Refresh icon rotates
        ↓
Frontend requests fresh backend data
        ↓
Dashboard metrics update
        ↓
Refresh animation stops
```

The refresh operation updates the dashboard using the latest available backend data.

---

# 🏗️ System Architecture

```text
┌────────────────────────────────────────────┐
│              React Frontend                │
│          TypeScript + Vite                 │
│                                            │
│ Dashboard │ CRM │ Products │ Inventory     │
│ Stock Movements │ Sales Challans            │
└──────────────────────┬─────────────────────┘
                       │
                       │ REST API
                       │ JWT Authentication
                       ▼
┌────────────────────────────────────────────┐
│             Express Backend                │
│        Node.js + TypeScript                │
│                                            │
│ Authentication │ RBAC │ Validation         │
│ Business Logic │ Inventory Management      │
└──────────────────────┬─────────────────────┘
                       │
                       │ Prisma ORM
                       ▼
┌────────────────────────────────────────────┐
│               PostgreSQL                   │
│                                            │
│ Users │ Customers │ Products               │
│ Challans │ Challan Items │ Movements       │
└────────────────────────────────────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Axios
- HTML5
- CSS3
- Lucide Icons

## Backend

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- JWT
- bcryptjs
- Zod

## Database

- PostgreSQL

## Development & Testing

- Git
- GitHub
- Postman
- VS Code
- npm

---

# 📁 Project Structure

```text
fundsroom-erp/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   ├── src/
│   │   └── server.ts
│   │
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api.ts
│   │   ├── main.tsx
│   │   └── ...
│   │
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
│
├── postman/
│   └── Fundsroom.postman_collection.json
│
├── .gitignore
└── README.md
```

---

# ⚙️ Local Setup

## Prerequisites

Install the following:

- Node.js 20+
- npm
- PostgreSQL
- Git

---

## 1. Clone the Repository

```bash
git clone https://github.com/Himanshusekharsahoo/fundsroom-erp.git
```

```bash
cd fundsroom-erp
```

---

# 2. Backend Setup

Navigate to the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

---

## Configure Backend Environment Variables

Create:

```text
backend/.env
```

Example:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/fundsroom_erp?schema=public"
JWT_SECRET="your-secret-key"
PORT=5000
```

> Do not commit `.env` to GitHub.

The repository contains:

```text
backend/.env.example
```

as a safe configuration template.

---

## Generate Prisma Client

```bash
npx prisma generate
```

---

## Run Database Migration

```bash
npx prisma migrate dev
```

---

## Seed Demo Data

```bash
npm run seed
```

---

## Start Backend

```bash
npx tsx src/server.ts
```

Backend:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

---

# 3. Frontend Setup

Open another terminal.

From the project root:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create:

```text
frontend/.env
```

Add:

```env
VITE_API_URL="http://localhost:5000/api"
```

Start the frontend:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# 🔑 Demo Login Credentials

The seed data provides demo users for testing.

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@fundsroom.demo` | `Password@123` |
| Sales | `sales@fundsroom.demo` | `Password@123` |
| Warehouse | `warehouse@fundsroom.demo` | `Password@123` |
| Accounts | `accounts@fundsroom.demo` | `Password@123` |

> These credentials are intended for local case-study demonstration.

---

# 🔌 API Overview

## Authentication

```http
POST /api/auth/login
```

---

## Customers

```http
GET  /api/customers
GET  /api/customers/:id
POST /api/customers
PUT  /api/customers/:id
```

---

## Products

```http
GET  /api/products
GET  /api/products/:id
POST /api/products
PUT  /api/products/:id
```

---

## Inventory / Stock Movements

```http
GET  /api/inventory/movements
POST /api/inventory/movements
```

---

## Sales Challans

```http
GET  /api/challans
POST /api/challans
PUT  /api/challans/:id/confirm
PUT  /api/challans/:id/cancel
```

---

## Dashboard

```http
GET /api/dashboard
GET /api/dashboard?days=7
GET /api/dashboard?days=30
GET /api/dashboard?days=90
```

---

# 🔐 API Authentication

Protected APIs use JWT authentication.

Example:

```http
Authorization: Bearer <JWT_TOKEN>
```

Authentication flow:

```text
Login
  ↓
JWT Token
  ↓
Bearer Token
  ↓
Protected API Request
  ↓
Authentication
  ↓
Role Authorization
  ↓
API Operation
```

---

# 🛡️ Authorization

Role-based authorization is enforced on the backend.

A user without sufficient permissions receives an appropriate HTTP error response instead of relying only on frontend navigation restrictions.

Example:

```json
{
  "message": "Insufficient permissions"
}
```

---

# 🧪 API Testing with Postman

A Postman collection is included:

```text
postman/Fundsroom.postman_collection.json
```

Import the collection into Postman to test the backend APIs.

### Recommended Testing Flow

```text
1. Login
      ↓
2. Receive JWT
      ↓
3. Test Customers
      ↓
4. Test Products
      ↓
5. Test Inventory
      ↓
6. Create Draft Challan
      ↓
7. Confirm Challan
      ↓
8. Verify Stock Deduction
      ↓
9. Verify OUT Movement
      ↓
10. Test Insufficient Stock
      ↓
11. Test Role Permissions
```

---

# 🧪 Build Verification

Before submission, verify both applications.

## Backend

```bash
cd backend
npm run build
```

## Frontend

```bash
cd frontend
npm run build
```

Both builds should complete successfully without TypeScript/build errors.

---

# 🎥 Project Demo

A screen recording demonstrating the complete application flow is provided below.

> Replace the placeholder with the actual Google Drive video link before submission.

```text
VIDEO_LINK_HERE
```

Or use:

```markdown
[▶ Watch Project Demo](YOUR_GOOGLE_DRIVE_VIDEO_LINK)
```

### Demo Flow

The recording demonstrates:

```text
Login
  ↓
Dashboard
  ↓
Customers
  ↓
Products
  ↓
Inventory
  ↓
Stock Movements
  ↓
Sales Challans
  ↓
Create Challan
  ↓
Confirm Challan
  ↓
Stock Deduction
  ↓
Stock Movement OUT Entry
  ↓
Insufficient Stock Validation
  ↓
Role-Based Access
```

---

# 📱 Responsive UI

The application provides a responsive admin-style interface for:

- Desktop
- Tablet
- Mobile

The interface includes:

- Fixed navigation sidebar
- Responsive navigation
- Dashboard cards
- Data tables
- Search
- Filters
- Forms
- Modals
- Status badges
- Inventory controls
- Sales challan workflow

---

# 📋 Case Study Requirements Covered

The project addresses the main requirements of the Fundsroom Fullstack Developer Case Study.

### Authentication

- JWT authentication
- Role-based access
- Admin
- Sales
- Warehouse
- Accounts

### Customer CRM

- Add customer
- Edit customer
- Search customer
- Customer information
- Customer type
- Customer status
- Follow-up information
- Notes

### Product & Inventory

- Add product
- Edit product
- SKU
- Category
- Unit price
- Current stock
- Minimum stock threshold
- Warehouse
- Stock IN
- Stock movement history
- Low-stock identification
- Out-of-stock identification

### Sales Challans

- Create challan
- Customer selection
- Multiple products
- Quantity
- Automatic challan number
- Draft status
- Confirmed status
- Cancelled status
- Product snapshot
- Stock validation
- Negative stock prevention
- Automatic stock deduction
- OUT movement creation

### Backend

- REST APIs
- JWT authentication
- Role authorization
- Request validation
- HTTP status handling
- Error handling
- PostgreSQL
- Prisma ORM

### Frontend

- React
- TypeScript
- Responsive UI
- Dashboard
- Tables
- Forms
- Search
- Filters
- Role-aware navigation

### Testing & Submission

- Postman collection
- Seed/demo data
- Local setup instructions
- Screen recording
- GitHub repository

---

# ⚠️ Known Limitations

- The project is currently configured primarily for local development.
- A production deployment/live URL is not included in this repository.
- Advanced ERP functionality outside the core case-study workflow is not part of the current implementation.

---

# 📦 Submission Contents

This repository contains:

```text
├── Frontend
├── Backend
├── PostgreSQL / Prisma Schema
├── Database Migrations
├── Seed Data
├── Postman Collection
├── Environment Templates
└── README Documentation
```

---

# 👨‍💻 Author

**Himanshu Sekhar Sahoo**

Full-Stack Developer | Backend & AI Enthusiast

GitHub:

```text
https://github.com/Himanshusekharsahoo
```

---

# 📄 License

This project is licensed under the [MIT License](LICENSE).
