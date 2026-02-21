import { CartClient } from "../../components/CartClient";

export default function CartPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Your Cart</h1>
      <CartClient />
    </div>
  );
}
