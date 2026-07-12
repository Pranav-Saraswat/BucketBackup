variable "aws_region" {
  type        = string
  description = "The target AWS region for the S3 backup bucket."
  default     = "us-east-1"
}

variable "aws_s3_bucket_name" {
  type        = string
  description = "The name of the AWS S3 backup bucket."
}

variable "gcp_project" {
  type        = string
  description = "The target GCP project ID."
}

variable "gcp_region" {
  type        = string
  description = "The target GCP region for GCS."
  default     = "us-central1"
}

variable "gcp_bucket_name" {
  type        = string
  description = "The name of the GCP Storage backup bucket."
}

variable "azure_location" {
  type        = string
  description = "The target Azure datacenter location for Blob container resources."
  default     = "East US"
}

variable "azure_storage_account_name" {
  type        = string
  description = "The name of the Azure Storage Account."
}

variable "azure_container_name" {
  type        = string
  description = "The name of the Azure Blob container."
}
