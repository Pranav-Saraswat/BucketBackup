resource "azurerm_resource_group" "backup" {
  name     = "bucketbackup-resources"
  location = var.azure_location
}

resource "azurerm_storage_account" "backup" {
  name                     = var.azure_storage_account_name
  resource_group_name      = azurerm_resource_group.backup.name
  location                 = azurerm_resource_group.backup.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  # Enforce TLS 1.2 and HTTPS only
  min_tls_version           = "TLS1_2"
  https_traffic_only_enabled = true
}

resource "azurerm_storage_container" "backup" {
  name                  = var.azure_container_name
  storage_account_name  = azurerm_storage_account.backup.name
  container_access_type = "private"
}

output "azure_storage_account_name" {
  value       = azurerm_storage_account.backup.name
  description = "The target Azure Storage Account name."
}

output "azure_storage_container_url" {
  value       = "https://${azurerm_storage_account.backup.name}.blob.core.windows.net/${azurerm_storage_container.backup.name}"
  description = "The target Azure Blob Container URL."
}
