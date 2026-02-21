"use client";

import { useEffect, useMemo, useState } from "react";
import { createOrder, formatNgn } from "../lib/api";
import { loadCart, saveCart, type CartItem } from "../lib/cart";
import { useToast, ToastContainer } from "./Toast";

export function CartClient() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    setItems(loadCart());
  }, []);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.qty * item.priceNaira, 0), [items]);

  function updateQty(productId: string, delta: number) {
    const next = items.map((i) => (i.productId === productId ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
    const item = items.find((i) => i.productId === productId);
    if (item) {
      if (delta > 0) {
        addToast(`Increased ${item.name} quantity to ${item.qty + 1}`, "info");
      } else {
        addToast(`Decreased ${item.name} quantity to ${Math.max(1, item.qty + delta)}`, "info");
      }
    }
    setItems(next);
    saveCart(next);
  }

  function remove(productId: string) {
    const item = items.find((i) => i.productId === productId);
    const next = items.filter((i) => i.productId !== productId);
    if (item) {
      addToast(`${item.name} removed from cart`, "error");
    }
    setItems(next);
    saveCart(next);
  }

  async function checkout() {
    try {
      setLoading(true);
      setError("");
      const payload = {
        customerName: name || undefined,
        customerPhone: phone || undefined,
        deliveryAddress: address || undefined,
        items: items.map((i) => ({ productId: i.productId, qty: i.qty }))
      };

      const result = await createOrder(payload);
      
      // Validate WhatsApp URL for security
      if (!result.whatsappUrl || !isValidWhatsAppUrl(result.whatsappUrl)) {
        throw new Error("Invalid WhatsApp URL from server");
      }
      
      addToast("Order created successfully! Redirecting to WhatsApp...", "success");
      saveCart([]);
      setTimeout(() => {
        window.location.href = result.whatsappUrl;
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to checkout";
      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  function isValidWhatsAppUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      // Only allow WhatsApp URLs
      return (
        urlObj.protocol === "https:" &&
        (urlObj.hostname === "wa.me" || 
         urlObj.hostname === "api.whatsapp.com" ||
         urlObj.hostname === "web.whatsapp.com")
      );
    } catch {
      return false;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {items.length === 0 ? <p>Your cart is empty.</p> : null}
      {items.map((item) => (
        <div key={item.productId} className="flex items-center justify-between rounded-md border border-clay bg-white p-3">
          <div>
            <p className="font-semibold text-ink">{item.name}</p>
            <p className="text-sm text-slate-600">{formatNgn(item.priceNaira)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => updateQty(item.productId, -1)} className="rounded border px-2 py-1">-</button>
            <span>{item.qty}</span>
            <button onClick={() => updateQty(item.productId, 1)} className="rounded border px-2 py-1">+</button>
            <button onClick={() => remove(item.productId)} className="rounded border px-2 py-1 text-red-600">Remove</button>
          </div>
        </div>
      ))}

      <div className="card">
        <p className="mb-2 font-semibold">Customer details (optional)</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded border px-3 py-2" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (e.g. +2348000000000)" className="rounded border px-3 py-2" />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col">
            <span className="text-xs text-slate-500">Amount (NGN)</span>
            <input value={(total / 100).toFixed(2)} readOnly className="rounded border px-3 py-2 bg-gray-50" />
          </label>
          <div />
        </div>
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="mt-3 w-full rounded border px-3 py-2" />
      </div>

      <div className="flex items-center justify-between rounded-md bg-ink p-4 text-white">
        <span>Total</span>
        <span className="font-semibold">{formatNgn(total)}</span>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button onClick={checkout} disabled={items.length === 0 || loading} className="w-full btn-primary py-3">
        {loading ? "Preparing WhatsApp..." : "Checkout via WhatsApp"}
      </button>
    </div>
  );
}
