$headers = @{ Origin='http://localhost:3000'; 'Content-Type'='application/json' }
$body = @{ email='admin@example.com'; password='admin1234' } | ConvertTo-Json
try {
  $res = Invoke-RestMethod -UseBasicParsing -Method Post -Uri 'http://localhost:4000/api/admin/login' -Headers $headers -Body $body
  Write-Output 'SUCCESS:'
  $res | ConvertTo-Json -Depth 5
} catch {
  Write-Output 'ERR:'
  Write-Output $_.Exception.Message
  if ($_.Exception.Response) {
    try {
      $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      Write-Output 'Response body:'
      Write-Output $sr.ReadToEnd()
    } catch {
      Write-Output 'Failed to read response stream'
    }
  }
}
