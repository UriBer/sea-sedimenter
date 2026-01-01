#!/bin/bash

# GCP Cloud Run Deployment Script
# Usage: ./deploy.sh [project-id] [region]

set -e

PROJECT_ID=${1:-${GOOGLE_CLOUD_PROJECT:-""}}
REGION=${2:-"us-central1"}

if [ -z "$PROJECT_ID" ]; then
    echo "Error: GCP Project ID required"
    echo "Usage: ./deploy.sh <project-id> [region]"
    echo "Or set GOOGLE_CLOUD_PROJECT environment variable"
    exit 1
fi

echo "Deploying to GCP Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Set project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com --quiet
gcloud services enable run.googleapis.com --quiet
gcloud services enable containerregistry.googleapis.com --quiet

# Build and submit
echo "Building and submitting container..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/sea-sedimenter

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy sea-sedimenter \
  --image gcr.io/$PROJECT_ID/sea-sedimenter \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --max-instances 10

# Get service URL
SERVICE_URL=$(gcloud run services describe sea-sedimenter --region $REGION --format 'value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo "Service URL: $SERVICE_URL"
echo ""
echo "Note: The app requires HTTPS for sensor access. Cloud Run provides HTTPS automatically."

