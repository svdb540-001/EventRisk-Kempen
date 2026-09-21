param(
  [Parameter(Mandatory=$true)][string]$TenantId,
  [Parameter(Mandatory=$true)][string]$SpaClientId,
  [Parameter(Mandatory=$true)][string]$ApiClientId,
  [string]$ApiScope = "",
  [string]$ResourceGroup = "rg-eventrisk-kempen-prod",
  [string]$Location = "westeurope",
  [string]$Prefix = "eventriskkempenprod",
  [string]$PostgresAdminUser = "eventriskadmin",
  [string]$AppServiceSku = "P1v3",
  [string]$PostgresSku = "Standard_B1ms"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  throw "Azure CLI (az) is niet geïnstalleerd of staat niet in PATH."
}

if ([string]::IsNullOrWhiteSpace($ApiScope)) {
  $ApiScope = "api://$ApiClientId/EventRisk.Access"
}

Write-Host "1/5 Azure-account controleren..." -ForegroundColor Cyan
az account show --only-show-errors | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Aanmelden bij Azure..." -ForegroundColor Yellow
  az login
}

Write-Host "2/5 Bicep controleren..." -ForegroundColor Cyan
az bicep version --only-show-errors | Out-Null
if ($LASTEXITCODE -ne 0) {
  az bicep install
}

Write-Host "3/5 Resource group maken of controleren..." -ForegroundColor Cyan
az group create --name $ResourceGroup --location $Location --only-show-errors | Out-Null

Write-Host "4/5 Infrastructuur uitrollen..." -ForegroundColor Cyan
Write-Host "Azure vraagt zo dadelijk om postgresAdminPassword. Gebruik een sterk uniek wachtwoord." -ForegroundColor Yellow

az deployment group create `
  --name eventrisk-infra-v2 `
  --resource-group $ResourceGroup `
  --template-file infra/main.bicep `
  --parameters `
    prefix=$Prefix `
    entraTenantId=$TenantId `
    entraSpaClientId=$SpaClientId `
    entraApiClientId=$ApiClientId `
    entraApiScope=$ApiScope `
    postgresAdminUser=$PostgresAdminUser `
    appServiceSku=$AppServiceSku `
    postgresSku=$PostgresSku `
  --only-show-errors

if ($LASTEXITCODE -ne 0) {
  throw "De Azure-deployment is mislukt. Bekijk de deployment operations in de resource group."
}

Write-Host "5/5 Outputs ophalen..." -ForegroundColor Cyan
$outputs = az deployment group show `
  --resource-group $ResourceGroup `
  --name eventrisk-infra-v2 `
  --query properties.outputs `
  --output json | ConvertFrom-Json

Write-Host "" 
Write-Host "Azure-infrastructuur is aangemaakt." -ForegroundColor Green
Write-Host "Web App-naam : $($outputs.webAppName.value)"
Write-Host "Web App-URL  : $($outputs.webAppUrl.value)"
Write-Host "Storage      : $($outputs.storageAccountName.value)"
Write-Host "PostgreSQL   : $($outputs.postgresServerName.value)"
Write-Host "Key Vault    : $($outputs.keyVaultName.value)"
Write-Host ""
Write-Host "Volgende stappen:" -ForegroundColor Yellow
Write-Host "1. Voeg $($outputs.webAppUrl.value) toe als SPA redirect URI in Microsoft Entra."
Write-Host "2. Rol de code eenmalig handmatig of via GitHub Actions uit."
Write-Host "3. Open $($outputs.webAppUrl.value)/api/health."
