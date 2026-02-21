import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config.js";
import { requireAdmin } from "../middleware/auth.js";
import { withTx } from "../db.js";
import { HttpError } from "../utils/http-error.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const upsertProductSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().max(4000).optional(),
  priceNaira: z.number().int().nonnegative(),
  stockQty: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  imageUrl: z.string().url().optional()
});

const statusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]),
  note: z.string().max(500).optional()
});

const orderQuerySchema = z.object({
  status: z.string().optional(),
  q: z.string().optional()
});

export const adminRouter = Router();

adminRouter.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const queryResult = await withTx((client) =>
      client.query("select id, email, password_hash from admins where email = $1", [input.email])
    ) as { rowCount: number; rows: unknown[] };

    if (queryResult.rowCount === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const admin = queryResult.rows[0] as { id: string; email: string; password_hash: string };
    const valid = await bcrypt.compare(input.password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ adminId: admin.id, email: admin.email }, env.JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, admin: { id: admin.id, email: admin.email } });
  } catch (error) {
    next(error);
  }
});

adminRouter.use(requireAdmin);

adminRouter.get("/orders", async (req, res, next) => {
  try {
    const queryParsed = orderQuerySchema.parse(req.query);
    const status = queryParsed.status?.trim();
    const q = queryParsed.q?.trim();

    const where: string[] = [];
    const values: unknown[] = [];
    if (status) {
      values.push(status);
      where.push(`o.status = $${values.length}`);
    }
    if (q) {
      values.push(`%${q}%`);
      where.push(`(o.order_code ilike $${values.length} or coalesce(o.customer_phone, '') ilike $${values.length})`);
    }

    const sql = `
      select o.id, o.order_code as "orderCode", o.status, o.customer_name as "customerName",
      o.customer_phone as "customerPhone", o.total_kobo as "totalNaira", o.created_at as "createdAt"
      from orders o
      ${where.length > 0 ? `where ${where.join(" and ")}` : ""}
      order by o.created_at desc
      limit 200
    `;

    const queryResult = await withTx((client) => client.query(sql, values));
    const { rows } = queryResult as { rows: unknown[] };
    return res.json(rows);
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/orders/:orderCode", async (req, res, next) => {
  try {
    const orderCode = req.params.orderCode;

    const result = await withTx(async (client) => {
      const order = await client.query(
        `select
          o.id,
          o.order_code as "orderCode",
          o.status,
          o.customer_name as "customerName",
          o.customer_phone as "customerPhone",
          o.customer_note as "customerNote",
          o.delivery_address as "deliveryAddress",
          o.subtotal_kobo as "subtotalNaira",
          o.total_kobo as "totalNaira",
          o.created_at as "createdAt"
         from orders o
         where o.order_code = $1
         limit 1`,
        [orderCode]
      );

      if (order.rowCount === 0) {
        throw new HttpError(404, "Order not found");
      }

      const items = await client.query(
        `select
          oi.product_name_snapshot as name,
          oi.qty,
          oi.unit_price_kobo_snapshot as "unitPriceNaira",
          oi.line_total_kobo as "lineTotalNaira"
         from order_items oi
         where oi.order_id = $1`,
        [order.rows[0].id]
      );

      const events = await client.query(
        `select
          e.from_status as "fromStatus",
          e.to_status as "toStatus",
          e.note,
          e.created_at as "createdAt"
         from order_status_events e
         where e.order_id = $1
         order by e.created_at desc`,
        [order.rows[0].id]
      );

      return {
        ...order.rows[0],
        items: items.rows,
        events: events.rows
      };
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/products", async (_req, res, next) => {
  try {
    const queryResult = await withTx((client) =>
      client.query(
        `select
          p.id,
          p.name,
          p.slug,
          p.description,
          p.price_kobo as "priceNaira",
          p.stock_qty as "stockQty",
          p.is_active as "isActive",
          p.is_featured as "isFeatured",
          p.category_id as "categoryId",
          c.name as "categoryName",
          coalesce(
            (
              select pi.url from product_images pi
              where pi.product_id = p.id
              order by pi.sort_order asc
              limit 1
            ),
            ''
          ) as image
        from products p
        left join categories c on c.id = p.category_id
        order by p.created_at desc`
      )
    ) as { rows: unknown[] };
    const { rows } = queryResult;
    return res.json(rows);
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/categories", async (_req, res, next) => {
  try {
    const queryResult = await withTx((client) =>
      client.query("select id, name, slug, parent_id as \"parentId\" from categories order by name asc")
    ) as { rows: unknown[] };
    const { rows } = queryResult;
    return res.json(rows);
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/categories", async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).max(100),
      slug: z.string().min(2).max(100),
      parentId: z.string().uuid().nullable().optional()
    });
    const input = schema.parse(req.body);

    const queryResult = await withTx((client) =>
      client.query(
        "insert into categories (id, name, slug, parent_id) values (gen_random_uuid(), $1, $2, $3) returning id, name, slug, parent_id as \"parentId\"",
        [input.name, input.slug, input.parentId ?? null]
      )
    );
    const { rows } = queryResult as { rows: unknown[] };
    return res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/categories/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await withTx((client) =>
      client.query("delete from categories where id = $1 returning id", [id])
    ) as { rowCount: number };
    if (result.rowCount === 0) {
      throw new HttpError(404, "Category not found");
    }
    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/orders/:orderCode/status", async (req, res, next) => {
  try {
    const parsed = statusSchema.parse(req.body);
    const orderCode = req.params.orderCode;

    await withTx(async (client) => {
      const current = await client.query("select id, status from orders where order_code = $1", [orderCode]) as { rowCount: number; rows: unknown[] };
      if (current.rowCount === 0) {
        throw new HttpError(404, "Order not found");
      }
      const order = current.rows[0] as { id: string; status: string };

      await client.query("update orders set status = $1, updated_at = now() where id = $2", [
        parsed.status,
        order.id
      ]);

      await client.query(
        `insert into order_status_events (id, order_id, from_status, to_status, changed_by_admin_id, note)
         values (gen_random_uuid(), $1, $2, $3, $4, $5)`,
        [order.id, order.status, parsed.status, req.admin?.adminId ?? null, parsed.note ?? null]
      );
    });

    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/products", async (req, res, next) => {
  try {
    const input = upsertProductSchema.parse(req.body);

    const result = await withTx(async (client) => {
      const created = await client.query(
        `insert into products (
          id, category_id, name, slug, description, price_kobo, stock_qty, is_active, is_featured
        ) values (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8
        ) returning id`,
        [
          input.categoryId ?? null,
          input.name,
          input.slug,
          input.description ?? null,
          input.priceNaira,
          input.stockQty,
          input.isActive,
          input.isFeatured
        ]
      );
      const id = created.rows[0].id as string;
      if (input.imageUrl) {
        await client.query(
          "insert into product_images (id, product_id, url, alt, sort_order) values (gen_random_uuid(), $1, $2, $3, 0)",
          [id, input.imageUrl, input.name]
        );
      }
      return { id };
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/products/:id", async (req, res, next) => {
  try {
    const input = upsertProductSchema.parse(req.body);
    const id = req.params.id;

    await withTx(async (client) => {
      const result = await client.query(
        `update products
        set category_id = $1, name = $2, slug = $3, description = $4,
            price_kobo = $5, stock_qty = $6, is_active = $7, is_featured = $8, updated_at = now()
        where id = $9`,
        [
          input.categoryId ?? null,
          input.name,
          input.slug,
          input.description ?? null,
          input.priceNaira,
          input.stockQty,
          input.isActive,
          input.isFeatured,
          id
        ]
      ) as { rowCount: number };

      if (result.rowCount === 0) {
        throw new HttpError(404, "Product not found");
      }
    });

    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/products/:id", async (req, res, next) => {
  try {
    await withTx(async (client) => {
      const result = await client.query("delete from products where id = $1", [req.params.id]);
      if (result.rowCount === 0) {
        throw new HttpError(404, "Product not found");
      }
    });
    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/analytics", async (_req, res, next) => {
  try {
    const data = await withTx(async (client) => {
      const totalSales = await client.query(
        "select coalesce(sum(total_kobo), 0) as total from orders where status in ('CONFIRMED', 'SHIPPED', 'DELIVERED')"
      );
      const ordersByDay = await client.query(
        "select date(created_at) as day, count(*)::int as count from orders group by day order by day desc limit 30"
      );
      const bestProducts = await client.query(
        `select oi.product_name_snapshot as name, sum(oi.qty)::int as sold
         from order_items oi
         group by oi.product_name_snapshot
         order by sold desc
         limit 10`
      );
      return {
        totalSalesKobo: Number(totalSales.rows[0].total),
        ordersByDay: ordersByDay.rows,
        bestProducts: bestProducts.rows
      };
    });

    return res.json(data);
  } catch (error) {
    next(error);
  }
});
