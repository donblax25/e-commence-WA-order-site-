import { getCategories, getProducts } from "../lib/api";
import { ProductGrid } from "../components/ProductGrid";

export default async function HomePage() {
  try {
    const [products, categories] = await Promise.all([getProducts(), getCategories()]);

    return (
      <div className="space-y-8">
          <section className="card bg-gradient-to-r from-[#efe2cf] to-[#f8f2ea] p-6 border-none">
          <p className="text-sm uppercase tracking-widest text-olive">Fast WhatsApp Checkout</p>
          <h1 className="mt-2 text-3xl font-semibold">Browse, add to cart, confirm order on WhatsApp</h1>
          <p className="mt-2 text-slate-700">No account required. Mobile-friendly shopping for trusted messaging-first markets.</p>
        </section>
        <ProductGrid products={products} categories={categories} />
      </div>
    );
  } catch (err) {
    // Surface error on server logs and render a friendly fallback UI
    // eslint-disable-next-line no-console
    console.error(err);
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-red-600">Failed to load products</h2>
        <p className="mt-2 text-sm text-slate-700">There was a problem loading products. Please try again later.</p>
      </div>
    );
  }
}
