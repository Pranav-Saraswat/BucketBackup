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
}

resource "azurerm_storage_container" "backup" {
  name                  = var.azure_container_name
  storage_account_name  = azurerm_storage_account.backup.name
  container_access_type = "private"
}

variable "azure_location" {
  default = "East US"
}

variable "azure_storage_account_name" {}
variable "azure_container_name" {}

output "azure_storage_account_name" {
  value = azurerm_storage_account.backup.name
}
