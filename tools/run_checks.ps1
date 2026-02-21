# Run basic API checks using PowerShell (avoid inline quoting pitfalls)
try {
  Write-Output "Checking API health..."
  $health = Invoke-RestMethod -UseBasicParsing http://localhost:4000/health
  Write-Output "Health: $($health | ConvertTo-Json -Compress)"

  Write-Output "Fetching products..."
  $products = Invoke-RestMethod -UseBasicParsing http://localhost:4000/api/products
  Write-Output "Products count: $($products.Count)"

  if ($products.Count -eq 0) { throw 'No products returned' }

  $first = $products[0]
  Write-Output "Creating order for product id: $($first.id)"

  $orderPayload = @{
    customerName = 'PS Tester'
    customerPhone = '+2348000000000'
    deliveryAddress = '123 PS Lane'
    items = @(@{ productId = $first.id; qty = 1 })
  }

  $orderJson = $orderPayload | ConvertTo-Json -Depth 10
  $orderRes = Invoke-RestMethod -UseBasicParsing -Method Post -Uri http://localhost:4000/api/orders -Body $orderJson -ContentType 'application/json'
  Write-Output "Order created: $($orderRes | ConvertTo-Json -Compress)"

  Write-Output "Admin login..."
  $loginJson = @{ email = 'admin@example.com'; password = 'admin1234' } | ConvertTo-Json
  $loginRes = Invoke-RestMethod -UseBasicParsing -Method Post -Uri http://localhost:4000/api/admin/login -Body $loginJson -ContentType 'application/json'
  $token = $loginRes.token
  if (-not $token) { throw 'Admin login failed' }
  Write-Output "Admin token received"

  Write-Output "Listing admin orders..."
  $orders = Invoke-RestMethod -UseBasicParsing -Uri http://localhost:4000/api/admin/orders -Headers @{ Authorization = "Bearer $token" }
  Write-Output "Admin orders count: $($orders.Count)"

  $orderCode = $orderRes.orderCode
  Write-Output "Fetching order detail for $orderCode"
  $detail = Invoke-RestMethod -UseBasicParsing -Uri http://localhost:4000/api/admin/orders/$orderCode -Headers @{ Authorization = "Bearer $token" }
  Write-Output "Order detail: $($detail | ConvertTo-Json -Compress)"

  Write-Output "Updating order status to CONFIRMED"
  $patchJson = @{ status = 'CONFIRMED'; note = 'Confirmed by PS check' } | ConvertTo-Json
  $patchRes = Invoke-RestMethod -UseBasicParsing -Method Patch -Uri http://localhost:4000/api/admin/orders/$orderCode/status -Headers @{ Authorization = "Bearer $token" } -Body $patchJson -ContentType 'application/json'
  Write-Output "Patch result: $($patchRes | ConvertTo-Json -Compress)"

  Write-Output "All checks completed successfully"
} catch {
  Write-Error "Check failed: $($_.Exception.Message)"
  exit 1
}
