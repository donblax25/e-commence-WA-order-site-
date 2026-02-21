import { Router } from "express";
import { z } from "zod";
import { withTx } from "../db.js";
import { buildWhatsappMessage, buildWhatsappUrl } from "../utils/whatsapp.js";
import { env } from "../config.js";
import { HttpError } from "../utils/http-error.js";

const createOrderSchema = z.object({
  customerName: z.string().min(1).max(100).optional(),
  customerPhone: z.string().min(5).max(30).optional(),
  customerNote: z.string().max(400).optional(),
  deliveryAddress: z.string().max(500).optional(),
  items: z.array(z.object({ productId: z.string().uuid(), qty: z.number().int().positive() })).min(1)
});

export const publicRouter = Router();

const productQuerySchema = z.object({
  search: z.string().optional(),
  categorySlug: z.string().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).optional().default("newest")
});

publicRouter.get("/categories", async (_req, res, next) => {
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

publicRouter.get("/products", async (req, res, next) => {
  try {
    const query = productQuerySchema.parse(req.query);
    const search = query.search?.trim();
    const categorySlug = query.categorySlug?.trim();
    const sort = query.sort;

    const sortSql =
      sort === "price_asc"
        ? "p.price_kobo asc"
        : sort === "price_desc"
          ? "p.price_kobo desc"
          : "p.created_at desc";

    const values: unknown[] = [];
    const where: string[] = ["p.is_active = true"];

    if (search) {
      values.push(`%${search}%`);
      where.push(`(p.name ilike $${values.length} or p.description ilike $${values.length})`);
    }

    if (categorySlug) {
      values.push(categorySlug);
      where.push(`c.slug = $${values.length}`);
    }

    const sql = `
      select
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price_kobo as "priceKobo",
        p.stock_qty as "stockQty",
        p.is_featured as "isFeatured",
        c.name as "categoryName",
        c.slug as "categorySlug",
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
      where ${where.join(" and ")}
      order by ${sortSql}
    `;

    const queryResult = await withTx((client) => client.query(sql, values)) as { rows: unknown[] };
    const { rows } = queryResult;
    return res.json(rows);
  } catch (error) {
    next(error);
  }
});

publicRouter.get("/products/:slug", async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const result = await withTx((client) =>
      client.query(
        `select
          p.id,
          p.name,
          p.slug,
          p.description,
          p.price_kobo as "priceNaira",
          p.stock_qty as "stockQty",
          p.is_featured as "isFeatured",
          c.name as "categoryName",
          c.slug as "categorySlug",
          coalesce(
            json_agg(json_build_object('url', pi.url, 'alt', pi.alt, 'sortOrder', pi.sort_order)
              order by pi.sort_order asc
            ) filter (where pi.id is not null),
            '[]'::json
          ) as images
        from products p
        left join categories c on c.id = p.category_id
        left join product_images pi on pi.product_id = p.id
        where p.slug = $1 and p.is_active = true
        group by p.id, c.name, c.slug
        limit 1`,
        [slug]
      )
    ) as { rowCount: number; rows: unknown[] };

    if (result.rowCount === 0) {
      throw new HttpError(404, "Product not found");
    }

    return res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

publicRouter.post("/orders", async (req, res, next) => {
  try {
    const parsed = createOrderSchema.parse(req.body);

    const result = await withTx(async (client) => {
      const itemResults: Array<{ productId: string; name: string; qty: number; unitPriceKobo: number }> = [];

      for (const item of parsed.items) {
        const query = await client.query(
          "select id, name, price_kobo, stock_qty from products where id = $1 and is_active = true for update",
          [item.productId]
        );

        if (query.rowCount === 0) {
          throw new HttpError(404, "One or more products do not exist");
        }

        const product = query.rows[0] as {
          id: string;
          name: string;
          price_kobo: number;
          stock_qty: number;
        };

        if (product.stock_qty < item.qty) {
          throw new HttpError(409, `Insufficient stock for ${product.name}`);
        }

        itemResults.push({
          productId: product.id,
          name: product.name,
          qty: item.qty,
          unitPriceKobo: product.price_kobo
        });
      }

      for (const item of itemResults) {
        await client.query("update products set stock_qty = stock_qty - $1 where id = $2", [
          item.qty,
          item.productId
        ]);
      }

      const subtotalKobo = itemResults.reduce((sum, item) => sum + item.unitPriceKobo * item.qty, 0);
      const totalKobo = subtotalKobo;

      const codeResult = await client.query(
        "select 'WA-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_code_seq')::text, 6, '0') as code"
      );

      const orderCode = codeResult.rows[0].code as string;

      const orderInsert = await client.query(
        `insert into orders (
          id, order_code, status, customer_name, customer_phone, customer_note, delivery_address,
          subtotal_kobo, total_kobo, currency
        ) values (
          gen_random_uuid(), $1, 'PENDING', $2, $3, $4, $5, $6, $7, 'NGN'
        ) returning id`,
        [
          orderCode,
          parsed.customerName ?? null,
          parsed.customerPhone ?? null,
          parsed.customerNote ?? null,
          parsed.deliveryAddress ?? null,
          subtotalKobo,
          totalKobo
        ]
      );

      const orderId = orderInsert.rows[0].id as string;

      for (const item of itemResults) {
        const lineTotalKobo = item.unitPriceKobo * item.qty;
        await client.query(
          `insert into order_items (
            id, order_id, product_id, product_name_snapshot,
            unit_price_kobo_snapshot, qty, line_total_kobo
          ) values (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6
          )`,
          [orderId, item.productId, item.name, item.unitPriceKobo, item.qty, lineTotalKobo]
        );
      }

      await client.query(
        `insert into order_status_events (
          id, order_id, from_status, to_status, changed_by_admin_id, note
        ) values (
          gen_random_uuid(), $1, null, 'PENDING', null, 'Order created via checkout'
        )`,
        [orderId]
      );

      const message = buildWhatsappMessage({
        orderCode,
        items: itemResults.map((i) => ({ name: i.name, qty: i.qty, lineTotalKobo: i.qty * i.unitPriceKobo })),
        totalKobo
      });

      return {
        orderCode,
        whatsappUrl: buildWhatsappUrl(env.BUSINESS_WHATSAPP_NUMBER, message)
      };
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
