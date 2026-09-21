@description('Azure-regio, bijvoorbeeld westeurope.')
param location string = resourceGroup().location

@description('Korte unieke naam in kleine letters, bijvoorbeeld eventriskkempenprod.')
param prefix string

@description('Microsoft Entra tenant-id.')
param entraTenantId string

@description('Client-id van de SPA-appregistratie.')
param entraSpaClientId string

@description('Client-id van de API-appregistratie.')
param entraApiClientId string

@description('Volledige API-scope, bijvoorbeeld api://<api-client-id>/EventRisk.Access.')
param entraApiScope string

@description('PostgreSQL-beheerdersnaam. Gebruik niet admin, root of administrator.')
param postgresAdminUser string = 'eventriskadmin'

@secure()
@description('Sterk PostgreSQL-beheerderswachtwoord.')
param postgresAdminPassword string

@description('App Service SKU. P1v3 is geschikt als productiestart; B1 is goedkoper voor acceptatie.')
param appServiceSku string = 'P1v3'

@description('PostgreSQL SKU.')
param postgresSku string = 'Standard_B1ms'

@description('PostgreSQL back-upretentie in dagen.')
param backupRetentionDays int = 14

var suffix = uniqueString(subscription().subscriptionId, resourceGroup().id, prefix)
var webAppName = take(toLower('${prefix}-${suffix}'), 60)
var planName = take(toLower('asp-${prefix}-${suffix}'), 40)
var storageName = take(replace(toLower('${prefix}${suffix}'), '-', ''), 24)
var postgresName = take(toLower('pg-${prefix}-${suffix}'), 63)
var keyVaultName = take(toLower('kv-${prefix}-${suffix}'), 24)
var databaseName = 'eventrisk'
var blobContainerName = 'eventrisk-documents'

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  kind: 'linux'
  sku: {
    name: appServiceSku
  }
  properties: {
    reserved: true
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: {
    name: 'Standard_ZRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    publicNetworkAccess: 'Enabled'
    encryption: {
      keySource: 'Microsoft.Storage'
      services: {
        blob: {
          enabled: true
        }
      }
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 30
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 30
    }
  }
}

resource documents 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: blobContainerName
  properties: {
    publicAccess: 'None'
  }
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: postgresName
  location: location
  sku: {
    name: postgresSku
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdminUser
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 32
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: backupRetentionDays
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Praktische eerste uitrol: Azure-resources mogen de database bereiken.
// Voor streng productiebeleid: vervang dit later door VNet-integratie/private access.
resource allowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    publicNetworkAccess: 'Enabled'
  }
}

resource dbPasswordSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'eventrisk-postgres-password'
  properties: {
    value: postgresAdminPassword
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|24-lts'
      alwaysOn: true
      healthCheckPath: '/api/health'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      appCommandLine: 'npm start'
    }
  }
}

resource webAppSettings 'Microsoft.Web/sites/config@2023-12-01' = {
  parent: webApp
  name: 'appsettings'
  properties: {
    NODE_ENV: 'production'
    APP_BASE_URL: 'https://${webApp.properties.defaultHostName}'
    AUTH_MODE: 'entra'
    ENTRA_TENANT_ID: entraTenantId
    ENTRA_SPA_CLIENT_ID: entraSpaClientId
    ENTRA_API_CLIENT_ID: entraApiClientId
    ENTRA_API_SCOPE: entraApiScope
    ENTRA_ALLOWED_TENANT_ID: entraTenantId
    ENTRA_ALLOWED_ROLES: 'EventRisk.Admin,EventRisk.Coordinator,EventRisk.D1,EventRisk.D2,EventRisk.D3'
    DATABASE_PROVIDER: 'postgres'
    DATABASE_HOST: postgres.properties.fullyQualifiedDomainName
    DATABASE_PORT: '5432'
    DATABASE_NAME: databaseName
    DATABASE_USER: postgresAdminUser
    DATABASE_PASSWORD: '@Microsoft.KeyVault(SecretUri=${dbPasswordSecret.properties.secretUriWithVersion})'
    DATABASE_SSL: 'true'
    DATABASE_SSL_REJECT_UNAUTHORIZED: 'true'
    STORAGE_PROVIDER: 'azure'
    AZURE_STORAGE_ACCOUNT_NAME: storage.name
    AZURE_STORAGE_CONTAINER: blobContainerName
    MOCK_CONNECTORS: 'false'
    SYNC_AUTOMATIC: 'false'
    SCM_DO_BUILD_DURING_DEPLOYMENT: 'true'
    WEBSITE_RUN_FROM_PACKAGE: '1'
  }
}

var storageBlobDataContributorRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
resource storageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, webApp.id, storageBlobDataContributorRoleId)
  scope: storage
  properties: {
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: storageBlobDataContributorRoleId
  }
}

var keyVaultSecretsUserRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
resource keyVaultRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, webApp.id, keyVaultSecretsUserRoleId)
  scope: keyVault
  properties: {
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: keyVaultSecretsUserRoleId
  }
}

output webAppName string = webApp.name
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output storageAccountName string = storage.name
output postgresServerName string = postgres.name
output keyVaultName string = keyVault.name
