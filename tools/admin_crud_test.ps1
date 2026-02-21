# Test Admin Category and Product CRUD operations
$base = "http://localhost:4000/api"

Write-Host "=== Admin CRUD Test ===" -ForegroundColor Cyan

# 1. Login
Write-Host "`n[1] Logging in..." -ForegroundColor Yellow
$loginRes = Invoke-RestMethod -UseBasicParsing -Method Post -Uri "$base/admin/login" `
  -Headers @{ "Content-Type"="application/json"; Origin="http://localhost:3001" } `
  -Body (@{ email="admin@example.com"; password="admin1234" } | ConvertTo-Json)

$token = $loginRes.token
Write-Host "✓ Login successful, token: $($token.Substring(0,20))..." -ForegroundColor Green

# 2. Get existing categories
Write-Host "`n[2] Fetching categories..." -ForegroundColor Yellow
$catRes = Invoke-RestMethod -UseBasicParsing -Uri "$base/admin/categories" `
  -Headers @{ Authorization="Bearer $token" }
Write-Host "✓ Found $(($catRes | Measure-Object).Count) categories" -ForegroundColor Green
$catRes | ForEach-Object { Write-Host "  - $($_.name)" }

# 3. Create new category
Write-Host "`n[3] Creating new category..." -ForegroundColor Yellow
$newCat = Invoke-RestMethod -UseBasicParsing -Method Post -Uri "$base/admin/categories" `
  -Headers @{ "Content-Type"="application/json"; Authorization="Bearer $token" } `
  -Body (@{ name="Test Category"; slug="test-category" } | ConvertTo-Json)
Write-Host "✓ Created category: $($newCat.name) (ID: $($newCat.id))" -ForegroundColor Green

# 4. Get products
Write-Host "`n[4] Fetching products..." -ForegroundColor Yellow
$prodRes = Invoke-RestMethod -UseBasicParsing -Uri "$base/admin/products" `
  -Headers @{ Authorization="Bearer $token" }
Write-Host "✓ Found $(($prodRes | Measure-Object).Count) products" -ForegroundColor Green
$prodRes | ForEach-Object { Write-Host "  - $($_.name) (NGN $(($_.priceKobo / 100).ToString('N2')))" }

# 5. Create new product
Write-Host "`n[5] Creating new product..." -ForegroundColor Yellow
$newProd = Invoke-RestMethod -UseBasicParsing -Method Post -Uri "$base/admin/products" `
  -Headers @{ "Content-Type"="application/json"; Authorization="Bearer $token" } `
  -Body (@{ 
    name="Test Product"
    slug="test-product"
    priceKobo=500000
    stockQty=10
    categoryId=$newCat.id
  } | ConvertTo-Json)
Write-Host "✓ Created product: $($newProd.name) (ID: $($newProd.id))" -ForegroundColor Green

# 6. Delete the test product
Write-Host "`n[6] Deleting test product..." -ForegroundColor Yellow
$delProd = Invoke-RestMethod -UseBasicParsing -Method Delete -Uri "$base/admin/products/$($newProd.id)" `
  -Headers @{ Authorization="Bearer $token" }
Write-Host "✓ Product deleted successfully" -ForegroundColor Green

# 7. Delete the test category
Write-Host "`n[7] Deleting test category..." -ForegroundColor Yellow
$delCat = Invoke-RestMethod -UseBasicParsing -Method Delete -Uri "$base/admin/categories/$($newCat.id)" `
  -Headers @{ Authorization="Bearer $token" }
Write-Host "✓ Category deleted successfully" -ForegroundColor Green

Write-Host "`n=== All tests passed! ===" -ForegroundColor Green
