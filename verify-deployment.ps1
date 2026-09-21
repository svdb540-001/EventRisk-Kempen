param(
  [Parameter(Mandatory=$true)][string]$AppUrl
)

$ErrorActionPreference = "Stop"
$base = $AppUrl.TrimEnd('/')
Write-Host "Healthcheck uitvoeren op $base/api/health ..." -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "$base/api/health" -Headers @{ Accept = 'application/json' }
if (-not $response.ok) { throw "De healthcheck gaf geen ok=true terug." }
if ($response.database -ne 'postgres') { throw "Productie gebruikt niet PostgreSQL maar $($response.database)." }
if ($response.storage -ne 'azure') { throw "Productie gebruikt niet Azure Storage maar $($response.storage)." }
Write-Host "OK — EventRisk Kempen is bereikbaar met PostgreSQL en Azure Storage." -ForegroundColor Green
$response | Format-List
