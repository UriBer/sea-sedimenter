terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "sea-sedimenter"
}

variable "image_tag" {
  description = "Container image tag"
  type        = string
  default     = "latest"
}

# Provider
provider "google" {
  project = var.project_id
  region  = var.region
}

# Use local project_id throughout

# Use existing project or create new one
# If project already exists, use data source; otherwise create it
data "google_project" "existing" {
  count       = var.create_project ? 0 : 1
  project_id  = var.project_id
}

resource "google_project" "project" {
  count           = var.create_project ? 1 : 0
  project_id      = var.project_id
  name            = var.project_id
  org_id          = var.org_id != "" ? var.org_id : null
  billing_account = var.billing_account != "" ? var.billing_account : null
}

locals {
  project_id = var.create_project ? google_project.project[0].project_id : data.google_project.existing[0].project_id
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "containerregistry.googleapis.com",
    "artifactregistry.googleapis.com",
  ])

  project = local.project_id
  service = each.value

  disable_dependent_services = false
  disable_on_destroy         = false
}

# Create Artifact Registry repository
resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = "docker-repo"
  description   = "Docker repository for sea-sedimenter"
  format        = "DOCKER"
  project       = local.project_id

  depends_on = [google_project_service.apis]
}

# Cloud Run Service
resource "google_cloud_run_service" "service" {
  name     = var.service_name
  location = var.region

  template {
    spec {
      containers {
        image = "${var.region}-docker.pkg.dev/${local.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/${var.service_name}:${var.image_tag}"

        ports {
          container_port = 8080
        }

        resources {
          limits = {
            cpu    = "1000m"
            memory = "256Mi"
          }
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "10"
        "autoscaling.knative.dev/minScale" = "0"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.docker_repo
  ]
}

# Allow unauthenticated access
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.service.name
  location = google_cloud_run_service.service.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Outputs
output "service_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_service.service.status[0].url
}

output "project_id" {
  description = "GCP Project ID"
  value       = google_project.project.project_id
}

output "artifact_registry_url" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}"
}

