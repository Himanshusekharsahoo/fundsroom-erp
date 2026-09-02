import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient, Role, CustomerType, CustomerStatus, MovementType, ChallanStatus } from "@prisma/client";
import { z } from "zod";

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

type AuthUser = { id: number; role: Role; email: string; name: string };
declare global {
  namespace Express {
    interface Request { user?: AuthUser }
  }
}

function sign(user: AuthUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "8h" });
}

function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return res.status(401).json({ message: "Authentication required" });
    req.user = jwt.verify(header.slice(7), JWT_SECRET) as AuthUser;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function roles(...allowed: Role[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !allowed.includes(req.user.role)) return res.status(403).json({ message: "Insufficient permissions" });
    next();
  };
}

const customerSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().min(10).max(15),
  email: z.string().email().optional().or(z.literal("")),
  businessName: z.string().min(2),
  gstNumber: z.string().optional(),
  customerType: z.nativeEnum(CustomerType),
  address: z.string().min(3),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.LEAD),
  followUpDate: z.string().optional(),
  notes: z.string().optional()
});

const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  category: z.string().min(2),
  unitPrice: z.coerce.number().nonnegative(),
  currentStock: z.coerce.number().int().nonnegative(),
  minStock: z.coerce.number().int().nonnegative(),
  warehouse: z.string().min(1)
});

const stockMovementSchema = z.object({
  productId: z.coerce.number().int().positive("A valid product is required"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  movementType: z.nativeEnum(MovementType).optional().default(MovementType.IN),
  reason: z.string().trim().min(1, "Reason is required")
});

const challanSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  items: z.array(z.object({
    productId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive()
  })).min(1)
});

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues?.[0]?.message || error.message;
  }
  return error instanceof Error ? error.message : "Unexpected server error";
}

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/auth/login", async (req, res) => {
  try {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const safeUser: AuthUser = { id: user.id, role: user.role, email: user.email, name: user.name };
    res.json({ token: sign(safeUser), user: safeUser });
  } catch (e) {
    res.status(400).json({ message: errorMessage(e) });
  }
});

app.get("/api/dashboard", auth, async (req, res) => {
  try {
    const daysParam = Math.max(1, Math.min(Number(req.query.days) || 7, 365));

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (daysParam - 1));
    startDate.setHours(0, 0, 0, 0);

    const [customers, products, challans, productRows, confirmed, allConfirmedChallans, periodConfirmedChallans] = await Promise.all([
      prisma.customer.count(),
      prisma.product.count(),
      prisma.challan.count(),
      prisma.product.findMany({ select: { currentStock: true, minStock: true } }),
      prisma.challan.count({ where: { status: ChallanStatus.CONFIRMED } }),
      prisma.challan.findMany({
        where: { status: ChallanStatus.CONFIRMED },
        include: { items: true }
      }),
      prisma.challan.findMany({
        where: {
          status: ChallanStatus.CONFIRMED,
          createdAt: { gte: startDate }
        },
        include: { items: true },
        orderBy: { createdAt: "asc" }
      })
    ]);

    const lowStock = productRows.filter(p => p.currentStock <= p.minStock).length;

    // Authoritative Net Sales: SUM(quantity * unitPriceSnapshot) for CONFIRMED challans only
    let netSales = 0;
    for (const c of allConfirmedChallans) {
      for (const item of c.items) {
        netSales += Number(item.unitPriceSnapshot) * item.quantity;
      }
    }

    // Daily distribution map for the selected period (7D, 30D, 90D)
    const dailyMap = new Map<string, { sales: number; orders: number }>();
    const dateList: string[] = [];
    for (let i = daysParam - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      dailyMap.set(dateKey, { sales: 0, orders: 0 });
      dateList.push(dateKey);
    }

    for (const c of periodConfirmedChallans) {
      const dateKey = c.createdAt.toISOString().split("T")[0];
      let challanRevenue = 0;
      for (const item of c.items) {
        challanRevenue += Number(item.unitPriceSnapshot) * item.quantity;
      }
      const current = dailyMap.get(dateKey) || { sales: 0, orders: 0 };
      current.sales += challanRevenue;
      current.orders += 1;
      dailyMap.set(dateKey, current);
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const salesOverview = dateList.map(dateKey => {
      const entry = dailyMap.get(dateKey) || { sales: 0, orders: 0 };
      const [y, m, d] = dateKey.split("-");
      const label = `${d} ${months[parseInt(m, 10) - 1]}`;
      return {
        date: dateKey,
        label,
        sales: Math.round(entry.sales * 100) / 100,
        orders: entry.orders
      };
    });

    const periodSales = salesOverview.reduce((sum, item) => sum + item.sales, 0);

    res.json({
      customers,
      products,
      challans,
      confirmed,
      lowStock,
      netSales: Math.round(netSales * 100) / 100,
      periodDays: daysParam,
      periodSales: Math.round(periodSales * 100) / 100,
      salesOverview
    });
  } catch (e) {
    res.status(500).json({ message: errorMessage(e) });
  }
});

app.get("/api/dashboard/sales-overview", auth, async (req, res) => {
  try {
    const daysParam = Math.max(1, Math.min(Number(req.query.days) || 7, 365));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (daysParam - 1));
    startDate.setHours(0, 0, 0, 0);

    const periodConfirmedChallans = await prisma.challan.findMany({
      where: {
        status: ChallanStatus.CONFIRMED,
        createdAt: { gte: startDate }
      },
      include: { items: true },
      orderBy: { createdAt: "asc" }
    });

    const dailyMap = new Map<string, { sales: number; orders: number }>();
    const dateList: string[] = [];
    for (let i = daysParam - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      dailyMap.set(dateKey, { sales: 0, orders: 0 });
      dateList.push(dateKey);
    }

    for (const c of periodConfirmedChallans) {
      const dateKey = c.createdAt.toISOString().split("T")[0];
      let challanRevenue = 0;
      for (const item of c.items) {
        challanRevenue += Number(item.unitPriceSnapshot) * item.quantity;
      }
      const current = dailyMap.get(dateKey) || { sales: 0, orders: 0 };
      current.sales += challanRevenue;
      current.orders += 1;
      dailyMap.set(dateKey, current);
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const salesOverview = dateList.map(dateKey => {
      const entry = dailyMap.get(dateKey) || { sales: 0, orders: 0 };
      const [y, m, d] = dateKey.split("-");
      const label = `${d} ${months[parseInt(m, 10) - 1]}`;
      return {
        date: dateKey,
        label,
        sales: Math.round(entry.sales * 100) / 100,
        orders: entry.orders
      };
    });

    const periodSales = salesOverview.reduce((sum, item) => sum + item.sales, 0);

    res.json({
      periodDays: daysParam,
      periodSales: Math.round(periodSales * 100) / 100,
      salesOverview
    });
  } catch (e) {
    res.status(500).json({ message: errorMessage(e) });
  }
});

app.get("/api/customers", auth, async (req, res) => {
  const q = String(req.query.search || "").trim();
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);
  const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { mobile: { contains: q } }, { businessName: { contains: q, mode: "insensitive" as const } }] } : {};
  const [data, total] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.customer.count({ where })
  ]);
  res.json({ data, total, page, limit });
});

app.post("/api/customers", auth, roles(Role.ADMIN, Role.SALES), async (req, res) => {
  try {
    const body = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({
      data: {
        ...body,
        email: body.email || null,
        gstNumber: body.gstNumber || null,
        notes: body.notes || null,
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
        createdById: req.user!.id
      }
    });
    res.status(201).json(customer);
  } catch (e) { res.status(400).json({ message: errorMessage(e) }); }
});

app.put("/api/customers/:id", auth, roles(Role.ADMIN, Role.SALES), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = customerSchema.partial().parse(req.body);
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...body,
        email: body.email === "" ? null : body.email,
        followUpDate: body.followUpDate === undefined ? undefined : body.followUpDate ? new Date(body.followUpDate) : null
      }
    });
    res.json(customer);
  } catch (e) { res.status(400).json({ message: errorMessage(e) }); }
});

app.get("/api/customers/:id", auth, async (req, res) => {
  const customer = await prisma.customer.findUnique({ where: { id: Number(req.params.id) }, include: { challans: true } });
  if (!customer) return res.status(404).json({ message: "Customer not found" });
  res.json(customer);
});

app.get("/api/products", auth, async (req, res) => {
  const q = String(req.query.search || "").trim();
  const data = await prisma.product.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" }
  });
  res.json(data);
});

app.post("/api/products", auth, roles(Role.ADMIN, Role.WAREHOUSE), async (req, res) => {
  try {
    const body = productSchema.parse(req.body);
    const product = await prisma.$transaction(async tx => {
      const p = await tx.product.create({ data: body });
      if (body.currentStock > 0) {
        await tx.stockMovement.create({
          data: { productId: p.id, quantity: body.currentStock, movementType: MovementType.IN, reason: "Initial stock", createdById: req.user!.id }
        });
      }
      return p;
    });
    res.status(201).json(product);
  } catch (e) { res.status(400).json({ message: errorMessage(e) }); }
});

app.put("/api/products/:id", auth, roles(Role.ADMIN, Role.WAREHOUSE), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = productSchema.partial().parse(req.body);
    const old = await prisma.product.findUnique({ where: { id } });
    if (!old) return res.status(404).json({ message: "Product not found" });
    const product = await prisma.product.update({ where: { id }, data: body });
    res.json(product);
  } catch (e) { res.status(400).json({ message: errorMessage(e) }); }
});

app.get("/api/inventory/movements", auth, async (_req, res) => {
  const movements = await prisma.stockMovement.findMany({
    include: { product: true, createdBy: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  res.json(movements);
});

app.post("/api/inventory/movements", auth, roles(Role.ADMIN, Role.WAREHOUSE), async (req, res) => {
  try {
    const body = stockMovementSchema.parse(req.body);
    if (body.movementType !== MovementType.IN) {
      return res.status(400).json({ message: "Only IN movements are supported via this endpoint" });
    }

    const movement = await prisma.$transaction(async tx => {
      const product = await tx.product.findUnique({ where: { id: body.productId } });
      if (!product) {
        throw new Error("Product not found");
      }

      await tx.product.update({
        where: { id: body.productId },
        data: {
          currentStock: { increment: body.quantity }
        }
      });

      return tx.stockMovement.create({
        data: {
          productId: body.productId,
          quantity: body.quantity,
          movementType: MovementType.IN,
          reason: body.reason,
          createdById: req.user!.id
        },
        include: {
          product: true,
          createdBy: { select: { name: true, role: true } }
        }
      });
    });

    res.status(201).json(movement);
  } catch (e) {
    res.status(400).json({ message: errorMessage(e) });
  }
});

app.get("/api/challans", auth, async (_req, res) => {
  const challans = await prisma.challan.findMany({
    include: { customer: true, items: true, createdBy: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" }
  });
  res.json(challans);
});

app.post("/api/challans", auth, roles(Role.ADMIN, Role.SALES), async (req, res) => {
  try {
    const body = challanSchema.parse(req.body);
    const products = await prisma.product.findMany({ where: { id: { in: body.items.map(i => i.productId) } } });
    if (products.length !== body.items.length) return res.status(400).json({ message: "One or more products not found" });

    const number = `CH-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const totalQuantity = body.items.reduce((sum, i) => sum + i.quantity, 0);
    const challan = await prisma.challan.create({
      data: {
        challanNumber: number,
        customerId: body.customerId,
        totalQuantity,
        createdById: req.user!.id,
        items: {
          create: body.items.map(i => {
            const p = products.find(x => x.id === i.productId)!;
            return {
              productId: p.id,
              productNameSnapshot: p.name,
              skuSnapshot: p.sku,
              unitPriceSnapshot: p.unitPrice,
              quantity: i.quantity
            };
          })
        }
      },
      include: { customer: true, items: true }
    });
    res.status(201).json(challan);
  } catch (e) { res.status(400).json({ message: errorMessage(e) }); }
});

app.put("/api/challans/:id/confirm", auth, roles(Role.ADMIN, Role.SALES), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await prisma.$transaction(async tx => {
      const challan = await tx.challan.findUnique({ where: { id }, include: { items: true } });
      if (!challan) throw new Error("Challan not found");
      if (challan.status !== ChallanStatus.DRAFT) throw new Error("Only draft challans can be confirmed");

      for (const item of challan.items) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, currentStock: { gte: item.quantity } },
          data: { currentStock: { decrement: item.quantity } }
        });
        if (updated.count !== 1) throw new Error(`Insufficient stock for ${item.productNameSnapshot} (${item.skuSnapshot})`);

        await tx.stockMovement.create({
          data: { productId: item.productId, quantity: item.quantity, movementType: MovementType.OUT, reason: `Sales challan ${challan.challanNumber}`, createdById: req.user!.id }
        });
      }

      return tx.challan.update({ where: { id }, data: { status: ChallanStatus.CONFIRMED }, include: { customer: true, items: true } });
    });
    res.json(result);
  } catch (e) { res.status(400).json({ message: errorMessage(e) }); }
});

app.put("/api/challans/:id/cancel", auth, roles(Role.ADMIN, Role.SALES), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const challan = await prisma.challan.findUnique({ where: { id } });
    if (!challan) return res.status(404).json({ message: "Challan not found" });
    if (challan.status === ChallanStatus.CONFIRMED) return res.status(400).json({ message: "Confirmed challan cannot be cancelled in this MVP" });
    const updated = await prisma.challan.update({ where: { id }, data: { status: ChallanStatus.CANCELLED } });
    res.json(updated);
  } catch (e) { res.status(400).json({ message: errorMessage(e) }); }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ message: errorMessage(err) });
});

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
