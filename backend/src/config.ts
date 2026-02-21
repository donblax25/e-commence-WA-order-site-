import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  BUSINESS_WHATSAPP_NUMBER: z.string().min(5),
  CORS_ORIGIN: z.string().default("http://localhost:3000")
});

export const env = schema.parse(process.env);
