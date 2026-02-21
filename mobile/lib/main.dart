import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

const apiBase = 'http://10.0.2.2:4000';

void main() {
  runApp(const WaCommerceApp());
}

class WaCommerceApp extends StatelessWidget {
  const WaCommerceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'WA Commerce',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFB56E2D)),
        useMaterial3: true,
      ),
      home: const ProductListPage(),
    );
  }
}

class Product {
  Product({
    required this.id,
    required this.name,
    required this.priceKobo,
    required this.stockQty,
  });

  final String id;
  final String name;
  final int priceKobo;
  final int stockQty;

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] as String,
      name: json['name'] as String,
      priceKobo: json['priceKobo'] as int,
      stockQty: json['stockQty'] as int,
    );
  }
}

class CartItem {
  CartItem({required this.product, required this.qty});

  final Product product;
  int qty;
}

class ProductListPage extends StatefulWidget {
  const ProductListPage({super.key});

  @override
  State<ProductListPage> createState() => _ProductListPageState();
}

class _ProductListPageState extends State<ProductListPage> {
  final List<CartItem> cart = [];
  List<Product> products = [];
  bool loading = true;
  String error = '';

  @override
  void initState() {
    super.initState();
    fetchProducts();
  }

  Future<void> fetchProducts() async {
    try {
      final response = await http.get(Uri.parse('$apiBase/api/products'));
      if (response.statusCode != 200) throw Exception('Failed to load products');
      final list = jsonDecode(response.body) as List<dynamic>;
      setState(() {
        products = list.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
        loading = false;
      });
    } catch (_) {
      setState(() {
        loading = false;
        error = 'Could not load products';
      });
    }
  }

  void addToCart(Product product) {
    final index = cart.indexWhere((item) => item.product.id == product.id);
    setState(() {
      if (index >= 0) {
        cart[index].qty += 1;
      } else {
        cart.add(CartItem(product: product, qty: 1));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('WA Commerce'),
        actions: [
          IconButton(
            onPressed: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => CartPage(cart: cart)),
              );
              setState(() {});
            },
            icon: Badge(
              label: Text('${cart.length}'),
              child: const Icon(Icons.shopping_cart_outlined),
            ),
          )
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error.isNotEmpty
              ? Center(child: Text(error))
              : ListView.builder(
                  itemCount: products.length,
                  itemBuilder: (context, index) {
                    final p = products[index];
                    return ListTile(
                      title: Text(p.name),
                      subtitle: Text('NGN ${(p.priceKobo / 100).toStringAsFixed(2)}'),
                      trailing: FilledButton(
                        onPressed: p.stockQty > 0 ? () => addToCart(p) : null,
                        child: const Text('Add'),
                      ),
                    );
                  },
                ),
    );
  }
}

class CartPage extends StatefulWidget {
  const CartPage({super.key, required this.cart});

  final List<CartItem> cart;

  @override
  State<CartPage> createState() => _CartPageState();
}

class _CartPageState extends State<CartPage> {
  bool loading = false;
  String error = '';

  int get total => widget.cart.fold(0, (sum, item) => sum + item.product.priceKobo * item.qty);

  Future<void> checkout() async {
    if (widget.cart.isEmpty) return;
    setState(() {
      loading = true;
      error = '';
    });

    try {
      final payload = {
        'items': widget.cart
            .map((item) => {
                  'productId': item.product.id,
                  'qty': item.qty,
                })
            .toList(),
      };

      final response = await http.post(
        Uri.parse('$apiBase/api/orders'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );

      if (response.statusCode != 201) {
        throw Exception('Order failed');
      }

      final json = jsonDecode(response.body) as Map<String, dynamic>;
      final url = json['whatsappUrl'] as String;
      final uri = Uri.parse(url);
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) throw Exception('Cannot launch WhatsApp');

      setState(() {
        widget.cart.clear();
      });
    } catch (_) {
      setState(() {
        error = 'Checkout failed';
      });
    } finally {
      setState(() {
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cart')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                itemCount: widget.cart.length,
                itemBuilder: (context, index) {
                  final item = widget.cart[index];
                  return ListTile(
                    title: Text(item.product.name),
                    subtitle: Text('Qty: ${item.qty}'),
                    trailing: Text('NGN ${((item.product.priceKobo * item.qty) / 100).toStringAsFixed(2)}'),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: Text(
                'Total: NGN ${(total / 100).toStringAsFixed(2)}',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: loading ? null : checkout,
                child: Text(loading ? 'Preparing...' : 'Checkout via WhatsApp'),
              ),
            ),
            if (error.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(error, style: const TextStyle(color: Colors.red)),
            ]
          ],
        ),
      ),
    );
  }
}
