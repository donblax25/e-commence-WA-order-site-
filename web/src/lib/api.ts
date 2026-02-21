const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type Product = {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  priceNaira: number;
  stockQty: number;
  image: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

export async function getProducts(params?: { search?: string; categorySlug?: string; sort?: string }) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.categorySlug) q.set("categorySlug", params.categorySlug);
  if (params?.sort) q.set("sort", params.sort);
  const res = await fetch(`${base}/api/products?${q.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let bodyMsg = text;
    try {
      const parsed = JSON.parse(text);
      bodyMsg = parsed.message ?? parsed.error ?? text;
    } catch {}
    throw new Error(`getProducts failed: ${res.status} ${bodyMsg}`);
  }
  return (await res.json()) as Product[];
}

export async function getCategories() {
  const res = await fetch(`${base}/api/categories`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let bodyMsg = text;
    try {
      const parsed = JSON.parse(text);
      bodyMsg = parsed.message ?? parsed.error ?? text;
    } catch {}
    throw new Error(`getCategories failed: ${res.status} ${bodyMsg}`);
  }
  return (await res.json()) as Category[];
}

export async function createOrder(payload: {
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  items: Array<{ productId: string; qty: number }>;
}) {
  const res = await fetch(`${base}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Order creation failed");
  }
  return (await res.json()) as { orderCode: string; whatsappUrl: string };
}

export function formatNgn(naira: number) {
  return `NGN ${naira.toFixed(2)}`;
}
