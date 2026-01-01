variable "project_id" {
  description = "GCP Project ID (must be globally unique)"
  type        = string
}

variable "region" {
  description = "GCP Region for resources"
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "sea-sedimenter"
}

variable "image_tag" {
  description = "Container image tag to deploy"
  type        = string
  default     = "latest"
}

variable "billing_account" {
  description = "GCP Billing Account ID (optional, set if creating new project)"
  type        = string
  default     = ""
}

variable "org_id" {
  description = "GCP Organization ID (optional, set if creating under organization)"
  type        = string
  default     = ""
}

variable "create_project" {
  description = "Whether to create a new project (false to use existing)"
  type        = bool
  default     = false
}

