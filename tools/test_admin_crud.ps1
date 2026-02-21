$base = "http://localhost:4000/api"

Write-Host "=== Testing Admin Category and Product CRUD ===" -ForegroundColor Cyan

# Login
Write-Host "`nStep 1: Logging in..." -ForegroundColor Yellow
$loginBody = @{ email = "admin@example.com"; password = "admin1234" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -UseBasicParsing -Method Post -Uri "$base/admin/login" `
  -Headers @{ "Content-Type" = "application/json"; Origin = "http://localhost:3001" } `
  -Body $loginBody

$token = $loginRes.token
Write-Host "Login OK - Token obtained" -ForegroundColor Green

# Fetch existing categories
Write-Host "`nStep 2: Fetching categories..." -ForegroundColor Yellow
$cats = Invoke-RestMethod -UseBasicParsing -Uri "$base/admin/categories" `
  -Headers @{ Authorization = "Bearer $token" }
Write-Host "Categories found: $(($cats | Measure-Object).Count)" -ForegroundColor Green
$cats | ForEach-Object { Write-Host "  * $($_.name)" }

# Create test category
Write-Host "`nStep 3: Creating test category..." -ForegroundColor Yellow
$catBody = @{ name = "TestCat"; slug = "test-cat" } | ConvertTo-Json
$newCat = Invoke-RestMethod -UseBasicParsing -Method Post -Uri "$base/admin/categories" `
  -Headers @{ "Content-Type" = "application/json"; Authorization = "Bearer $token" } `
  -Body $catBody
Write-Host "Created: $($newCat.name) (ID: $($newCat.id))" -ForegroundColor Green

# Fetch products
Write-Host "`nStep 4: Fetching products..." -ForegroundColor Yellow
$products = Invoke-RestMethod -UseBasicParsing -Uri "$base/admin/products" `
  -Headers @{ Authorization = "Bearer $token" }
Write-Host "Products found: $(($products | Measure-Object).Count)" -ForegroundColor Green
$products | ForEach-Object { Write-Host "  * $($_.name) - NGN $(($_.priceKobo / 100).ToString('N2'))" }

# Cleanup: Delete test category
Write-Host "`nStep 5: Cleaning up test category..." -ForegroundColor Yellow
$delRes = Invoke-RestMethod -UseBasicParsing -Method Delete -Uri "$base/admin/categories/$($newCat.id)" `
  -Headers @{ Authorization = "Bearer $token" }
Write-Host "Test category deleted successfully" -ForegroundColor Green

Write-Host "`nAll tests completed successfully!" -ForegroundColor Magenta
