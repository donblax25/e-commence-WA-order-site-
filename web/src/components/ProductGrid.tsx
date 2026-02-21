"use client";

import { useMemo, useState } from "react";
import { formatNgn, type Category, type Product } from "../lib/api";
import { loadCart, saveCart } from "../lib/cart";
import { useToast, ToastContainer } from "./Toast";

export function ProductGrid({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const { toasts, addToast, removeToast } = useToast();

  const filtered = useMemo(() => {
    let items = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (category) items = items.filter((p) => p.categorySlug === category);
    if (sort === "price_asc") items = [...items].sort((a, b) => a.priceNaira - b.priceNaira);
    if (sort === "price_desc") items = [...items].sort((a, b) => b.priceNaira - a.priceNaira);
    return items;
  }, [products, search, category, sort]);

  function addToCart(product: Product) {
    const cart = loadCart();
    const existing = cart.find((i) => i.productId === product.id);
    if (existing) {
      existing.qty += 1;
      addToast(`${product.name} - Qty: ${existing.qty}`, "success");
    } else {
      cart.push({ productId: product.id, name: product.name, priceNaira: product.priceNaira, qty: 1 });
      addToast(`${product.name} added to cart`, "success");
    }
    saveCart(cart);
    window.dispatchEvent(new Event("cart:update"));
  }

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="grid gap-3 md:grid-cols-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products"
          className="rounded-md border border-clay bg-white px-3 py-2"
        />
        <select className="rounded-md border border-clay bg-white px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="rounded-md border border-clay bg-white px-3 py-2" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price low-high</option>
          <option value="price_desc">Price high-low</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <article key={p.id} className="card">
            <div className="mb-3 aspect-[4/3] rounded-md bg-sand overflow-hidden">
              {p.image ? (
                <img src={p.image} alt={p.name} className="h-full w-full rounded-md object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-slate-500">No image</div>
              )}
            </div>
            <h3 className="text-lg font-semibold text-ink">{p.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{p.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-semibold text-olive">{formatNgn(p.priceNaira)}</span>
              <button
                disabled={p.stockQty < 1}
                onClick={() => addToCart(p)}
                className="btn-primary disabled:opacity-50"
              >
                {p.stockQty > 0 ? "Add" : "Out of stock"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
