import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config.js";
import { withTx } from "../db.js";
import { HttpError } from "../utils/http-error.js";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().max(100).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const customerRouter = Router();

customerRouter.post("/signup", async (req, res, next) => {
  try {
    const input = signupSchema.parse(req.body);

    const result = await withTx(async (client) => {
      // Check if customer already exists
      const existing = await client.query("select id from customers where email = $1", [
        input.email
      ]) as { rowCount: number; rows: unknown[] };

      if (existing.rowCount! > 0) {
        throw new HttpError(409, "Email already registered");
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Create customer
      const created = await client.query(
        `insert into customers (id, email, password_hash, name)
         values (gen_random_uuid(), $1, $2, $3)
         returning id, email, name`,
        [input.email, passwordHash, input.name ?? null]
      ) as { rowCount: number; rows: unknown[] };

      const customer = created.rows[0] as { id: string; email: string; name?: string };
      const token = jwt.sign({ customerId: customer.id, email: customer.email }, env.JWT_SECRET, {
        expiresIn: "30d"
      });

      return { token, customer };
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

customerRouter.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);

    const queryResult = await withTx((client) =>
      client.query("select id, email, password_hash, name from customers where email = $1", [
        input.email
      ])
    ) as { rowCount: number; rows: unknown[] };

    if (queryResult.rowCount === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const customer = queryResult.rows[0] as {
      id: string;
      email: string;
      password_hash: string;
      name?: string;
    };
    const valid = await bcrypt.compare(input.password, customer.password_hash);

    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ customerId: customer.id, email: customer.email }, env.JWT_SECRET, {
      expiresIn: "30d"
    });

    return res.json({
      token,
      customer: { id: customer.id, email: customer.email, name: customer.name }
    });
  } catch (error) {
    next(error);
  }
});
