import bcrypt from "bcryptjs";
import { env } from "../config.js";
import { pool } from "../db.js";

async function seed() {
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);

  await pool.query(
    `insert into admins (id, email, password_hash, role)
     values (gen_random_uuid(), $1, $2, 'OWNER')
     on conflict (email) do update set password_hash = excluded.password_hash`,
    [env.ADMIN_EMAIL, passwordHash]
  );

  await pool.query(
    `insert into categories (id, name, slug, parent_id)
     values
       (gen_random_uuid(), 'Electronics', 'electronics', null),
       (gen_random_uuid(), 'Fashion', 'fashion', null)
     on conflict (slug) do nothing`
  );

  const category = await pool.query("select id from categories where slug = 'electronics' limit 1") as { rowCount: number | null; rows: unknown[] };
  if ((category.rowCount ?? 0) > 0) {
    const categoryId = (category.rows[0] as { id: string }).id;
    await pool.query(
      `insert into products (
        id, category_id, name, slug, description, price_kobo, stock_qty, is_active, is_featured
      ) values (
        gen_random_uuid(), $1, 'Wireless Earbuds', 'wireless-earbuds',
        'Noise isolated earbuds with charging case.', 1850000, 40, true, true
      ) on conflict (slug) do nothing`,
      [categoryId]
    );
  }

  console.log("Seed complete");
  await pool.end();
}

seed().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
