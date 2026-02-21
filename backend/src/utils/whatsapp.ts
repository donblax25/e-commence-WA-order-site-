export function formatNgnFromKobo(amount: number) {
  return `NGN ${(amount / 100).toFixed(2)}`;
}

export function buildWhatsappMessage(input: {
  orderCode: string;
  items: Array<{ name: string; qty: number; lineTotalKobo: number }>;
  totalKobo: number;
}) {
  const lines = input.items
    .map((item) => `- ${item.name} (x${item.qty}) - ${formatNgnFromKobo(item.lineTotalKobo)}`)
    .join("\n");

  return [
    "Hello, I would like to place an order:",
    "",
    `Order ID: ${input.orderCode}`,
    "Order Details:",
    lines,
    "",
    `Total: ${formatNgnFromKobo(input.totalKobo)}`,
    "",
    "Delivery Address:",
    "[Please add your address]"
  ].join("\n");
}

export function buildWhatsappUrl(number: string, message: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
