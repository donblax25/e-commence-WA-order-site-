"use client";

import { FormEvent, useState } from "react";
import { useToast, ToastContainer } from "../../components/Toast";

const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type Order = {
  orderCode: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  totalNaira: number;
};

type Status = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";

type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceNaira: number;
  stockQty: number;
  isActive: boolean;
  isFeatured: boolean;
  categoryName?: string;
  image: string;
};

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin1234");
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [productName, setProductName] = useState("");
  const [productSlug, setProductSlug] = useState("");
  const [productPrice, setProductPrice] = useState("0");
  const [productStock, setProductStock] = useState("0");
  const [productCategoryId, setProductCategoryId] = useState<string | null>(null);
  const [productImageDataUrl, setProductImageDataUrl] = useState<string | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  async function login(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${base}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        // Don't expose backend errors to user - use generic message
        setError("Invalid email or password");
        addToast("Login failed", "error");
        return;
      }
      const data = await res.json();
      if (!data.token || typeof data.token !== "string") {
        throw new Error("Invalid token received");
      }
      setToken(data.token);
      addToast("Logged in successfully", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login error";
      console.error("Login error:", msg);
      setError("An error occurred during login");
      addToast("Login error", "error");
    }
  }

  async function fetchOrders() {
    setError("");
    const res = await fetch(`${base}/api/admin/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      setError("Failed to fetch orders");
      return;
    }
    const data = await res.json();
    setOrders(data);
  }

  async function fetchCategories() {
    setError("");
    const res = await fetch(`${base}/api/admin/categories`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      setError("Failed to fetch categories");
      return;
    }
    const data = await res.json();
    setCategories(data);
  }

  async function createCategory(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`${base}/api/admin/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: categoryName, slug: categorySlug })
    });
    if (!res.ok) {
      const errorMsg = "Failed to create category";
      setError(errorMsg);
      addToast(errorMsg, "error");
      return;
    }
    addToast(`Category "${categoryName}" created successfully`, "success");
    setCategoryName("");
    setCategorySlug("");
    await fetchCategories();
  }

  async function deleteCategory(categoryId: string) {
    setError("");
    const catName = categories.find((c) => c.id === categoryId)?.name || "Category";
    const res = await fetch(`${base}/api/admin/categories/${categoryId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const errorMsg = "Failed to delete category";
      setError(errorMsg);
      addToast(errorMsg, "error");
      return;
    }
    addToast(`${catName} deleted successfully`, "success");
    await fetchCategories();
  }

  async function fetchProducts() {
    setError("");
    const res = await fetch(`${base}/api/admin/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      setError("Failed to fetch products");
      return;
    }
    const data = await res.json();
    setProducts(data);
  }

  async function deleteProduct(productId: string) {
    setError("");
    const prodName = products.find((p) => p.id === productId)?.name || "Product";
    const res = await fetch(`${base}/api/admin/products/${productId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const errorMsg = "Failed to delete product";
      setError(errorMsg);
      addToast(errorMsg, "error");
      return;
    }
    addToast(`${prodName} deleted successfully`, "success");
    await fetchProducts();
  }

  async function updateOrderStatus(orderCode: string, status: Status) {
    const res = await fetch(`${base}/api/admin/orders/${orderCode}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });

    if (!res.ok) {
      setError("Failed to update order status");
      return;
    }

    await fetchOrders();
  }

  async function createProduct(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`${base}/api/admin/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: productName,
        slug: productSlug,
        categoryId: productCategoryId ?? undefined,
        priceNaira: Number(productPrice),
        stockQty: Number(productStock),
        imageUrl: productImageDataUrl ?? undefined,
        isActive: true,
        isFeatured: false
      })
    });

    if (!res.ok) {
      const errorMsg = "Failed to create product";
      setError(errorMsg);
      addToast(errorMsg, "error");
      return;
    }

    addToast(`Product "${productName}" created successfully`, "success");
    setProductName("");
    setProductSlug("");
    setProductPrice("0");
    setProductStock("0");
    setProductCategoryId(null);
    setProductImageDataUrl(null);
    await fetchProducts();
  }

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      {!token ? (
        <form onSubmit={login} className="space-y-3 rounded-md border border-clay bg-white p-4">
          <input placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border px-3 py-2" />
          <input placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full rounded border px-3 py-2" />
          <button className="rounded bg-ink px-4 py-2 text-white">Login</button>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={fetchOrders} className="rounded bg-ink px-4 py-2 text-white">Load Orders</button>
            <button onClick={fetchCategories} className="rounded bg-green-600 px-4 py-2 text-white">Load Categories</button>
            <button onClick={fetchProducts} className="rounded bg-amber-600 px-4 py-2 text-white">Load Products</button>
          </div>

          <form onSubmit={createCategory} className="space-y-2 rounded-md border border-green-200 bg-green-50 p-4">
            <p className="font-medium text-green-900">Add Category</p>
            <input placeholder="Category name (e.g. Electronics)" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="w-full rounded border px-3 py-2" />
            <input placeholder="Slug (e.g. electronics)" value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} className="w-full rounded border px-3 py-2" />
            <button className="rounded bg-green-600 px-4 py-2 text-white">Create Category</button>
          </form>

          {categories.length > 0 && (
            <div className="card">
              <p className="font-medium mb-3">Categories ({categories.length})</p>
              <div className="space-y-2">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-green-50 p-3 rounded text-sm border border-green-200">
                    <div className="flex-1">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-slate-500">Slug: {c.slug}</p>
                    </div>
                    <button onClick={() => deleteCategory(c.id)} className="ml-2 rounded bg-red-500 px-3 py-1 text-white text-xs hover:bg-red-600">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={createProduct} className="space-y-2 rounded-md border border-clay bg-white p-4">
            <p className="font-medium">Add Product</p>
            <input placeholder="Product name (e.g. Wireless Earbuds)" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full rounded border px-3 py-2" />
            <input placeholder="Slug (e.g. wireless-earbuds)" value={productSlug} onChange={(e) => setProductSlug(e.target.value)} className="w-full rounded border px-3 py-2" />
            <select value={productCategoryId ?? ""} onChange={(e) => setProductCategoryId(e.target.value || null)} className="w-full rounded border px-3 py-2">
              <option value="">Select Category (Optional)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Price in Naria (e.g. 5000)" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} className="w-full rounded border px-3 py-2" />
              <input placeholder="Stock quantity (e.g. 40)" value={productStock} onChange={(e) => setProductStock(e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div className="flex items-center gap-3">
              <label className="rounded-md bg-slate-100 px-3 py-2 text-sm border border-clay cursor-pointer">
                Upload image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = reader.result as string | null;
                      setProductImageDataUrl(result);
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="sr-only"
                />
              </label>
              {productImageDataUrl ? (
                <img src={productImageDataUrl} alt="preview" className="h-16 w-16 rounded object-cover" />
              ) : (
                <div className="h-16 w-16 rounded bg-sand flex items-center justify-center text-xs text-slate-500">No image</div>
              )}
            </div>

            <button className="rounded bg-olive px-4 py-2 text-white">Create Product</button>
          </form>

          {products.length > 0 && (
            <div className="card">
              <p className="font-medium mb-3">Products ({products.length})</p>
              <div className="space-y-2">
                {products.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-amber-50 p-3 rounded text-sm border border-amber-200">
                    <div className="flex-1">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-slate-500">NGN {(p.priceNaira ?? 0).toFixed(2)} {p.categoryName && `• ${p.categoryName}`} • Stock: {p.stockQty}</p>
                    </div>
                    <button onClick={() => deleteProduct(p.id)} className="ml-2 rounded bg-red-500 px-3 py-1 text-white text-xs hover:bg-red-600">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.orderCode} className="rounded border border-clay bg-white p-3">
                <p className="font-medium">{o.orderCode}</p>
                <p className="text-sm text-slate-600">{o.status} | {o.customerPhone ?? "No phone"} | NGN {(o.totalNaira ?? 0).toFixed(2)}</p>
                <div className="mt-2 flex gap-2">
                  {(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"] as Status[]).map((s) => (
                    <button key={s} onClick={() => updateOrderStatus(o.orderCode, s)} className="rounded border px-2 py-1 text-xs">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
