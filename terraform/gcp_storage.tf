resource "google_storage_bucket" "backup" {
  name          = var.gcp_bucket_name
  location      = var.gcp_region
  storage_class = "STANDARD"

  versioning {
    enabled = true
  }

  uniform_bucket_level_access = true
}

output "gcp_bucket_url" {
  value       = google_storage_bucket.backup.url
  description = "The target GCP Storage backup bucket URL."
}
