output "service_url" {
  description = "Cloud Run service URL (HTTPS enabled automatically)"
  value       = google_cloud_run_service.service.status[0].url
}

output "project_id" {
  description = "GCP Project ID"
  value       = local.project_id
}

output "artifact_registry_url" {
  description = "Artifact Registry repository URL for pushing images"
  value       = "${var.region}-docker.pkg.dev/${local.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}"
}

output "deployment_instructions" {
  description = "Instructions for building and deploying"
  value = <<-EOT
    To deploy:
    1. Build and push image:
       gcloud builds submit --tag ${var.region}-docker.pkg.dev/${local.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/${var.service_name}:${var.image_tag}
    
    2. Or use Cloud Build trigger (automatic on git push)
    
    3. Service URL: ${google_cloud_run_service.service.status[0].url}
  EOT
}

