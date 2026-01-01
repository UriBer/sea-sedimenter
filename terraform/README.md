# Terraform Configuration for GCP Deployment

This Terraform configuration creates a GCP project and deploys the Sea Sedimenter app to Cloud Run.

## Prerequisites

1. **Install Terraform**: https://www.terraform.io/downloads
2. **Install gcloud CLI**: https://cloud.google.com/sdk/docs/install
3. **Authenticate**:
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

## Setup

1. **Copy variables file**:
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars`**:
   ```hcl
   project_id = "your-unique-project-id"
   region     = "us-central1"
   ```

3. **Initialize Terraform**:
   ```bash
   terraform init
   ```

4. **Plan deployment**:
   ```bash
   terraform plan
   ```

5. **Apply configuration**:
   ```bash
   terraform apply
   ```

## Building and Deploying

After Terraform creates the infrastructure:

### Option 1: Manual Build and Push

```bash
# Get the Artifact Registry URL from terraform output
ARTIFACT_REGISTRY=$(terraform output -raw artifact_registry_url)

# Build and push
gcloud builds submit --tag $ARTIFACT_REGISTRY/sea-sedimenter:latest

# The service will automatically use the new image
```

### Option 2: Use Cloud Build Trigger

1. Connect your repository to Cloud Source Repositories or GitHub
2. Create a Cloud Build trigger that uses `cloudbuild.yaml`
3. Push to your repository - automatic build and deploy

## Updating the Deployment

```bash
# Rebuild and push new image
gcloud builds submit --tag $ARTIFACT_REGISTRY/sea-sedimenter:latest

# Or update image tag in terraform.tfvars and run:
terraform apply -var="image_tag=v1.0.1"
```

## Destroying Resources

```bash
terraform destroy
```

**Warning**: This will delete the project and all resources!

## Important Notes

- **Project ID must be globally unique** across all GCP projects
- **Billing Account**: If creating a new project, you may need to set `billing_account` in `terraform.tfvars`
- **Organization**: If deploying under an organization, set `org_id` in `terraform.tfvars`
- The service URL will be output after `terraform apply` - it has HTTPS automatically enabled

