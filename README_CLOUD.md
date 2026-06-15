KejaApp: Google Cloud Operations Guide
This document outlines the architecture and deployment steps for KejaApp on Google Cloud Platform (GCP).

🏗️ Architecture Overview
Component	Technology	GCP Service
Backend	Node.js / Express	Cloud Run (Serverless)
Frontend	React (Vite)	Cloud Storage (Static Hosting)
Database	MongoDB	MongoDB Atlas (External)
Push Notifications	Firebase Admin SDK	FCM (via Cloud Run IAM)
Secrets	JWT / DB URIs	Secret Manager
Container Registry	Docker	Artifact Registry
🚀 One-Time Environment Setup
Run these commands to prepare your GCP project (project-2c9d548a-b209-4172-a39).

1. Enable APIs & Create Repository
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
    cloudbuild.googleapis.com secretmanager.googleapis.com

gcloud artifacts repositories create kejaapp-repo \
    --repository-format=docker --location=us-central1
Generated code may be subject to license restrictions not shown here. Use code with care. Learn more 

2. Configure IAM for Mobile Push
This allows your backend to send notifications to React Native devices without a manual key file.

gcloud projects add-iam-policy-binding project-2c9d548a-b209-4172-a39 \
    --member="serviceAccount:534875862502-compute@developer.gserviceaccount.com" \
    --role="roles/firebase.messagingAdmin"
Generated code may be subject to license restrictions not shown here. Use code with care. Learn more 

3. Store Production Secrets
echo -n "YOUR_MONGODB_ATLAS_URI" | gcloud secrets create MONGODB_URI --data-file=-
echo -n "YOUR_JWT_SECRET" | gcloud secrets create JWT_SECRET --data-file=-

# Grant access to the backend service account
gcloud secrets add-iam-policy-binding MONGODB_URI \
    --member="serviceAccount:534875862502-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
Generated code may be subject to license restrictions not shown here. Use code with care. Learn more 

🛠️ Deployment Workflow
1. Deploy the Backend
Execute this from the root of the /backend directory.

# Build and Push Image
gcloud builds submit --tag us-central1-docker.pkg.dev/project-2c9d548a-b209-4172-a39/kejaapp-repo/kejaapp-backend .

# Deploy to Cloud Run
gcloud run deploy kejaapp-backend \
    --image us-central1-docker.pkg.dev/project-2c9d548a-b209-4172-a39/kejaapp-repo/kejaapp-backend \
    --region us-central1 \
    --set-secrets="JWT_SECRET=JWT_SECRET:latest,MONGODB_URI=MONGODB_URI:latest" \
    --allow-unauthenticated
Generated code may be subject to license restrictions not shown here. Use code with care. Learn more 

2. Deploy the Frontend
Execute this from the root of the /frontend directory.

# Build static assets
npm run build

# Sync to GCS Bucket
gcloud storage buckets create gs://kejaapp-frontend-static --location=us-central1
gcloud storage cp -r ./dist/* gs://kejaapp-frontend-static

# Set as Static Website
gcloud storage buckets add-iam-policy-binding gs://kejaapp-frontend-static --member="allUsers" --role="roles/storage.objectViewer"
gcloud storage buckets update gs://kejaapp-frontend-static --web-main-page-suffix=index.html --web-error-page=index.html
Generated code may be subject to license restrictions not shown here. Use code with care. Learn more 

📱 React Native Roadmap Integration
The backend is now equipped with the following mobile-ready endpoints:

POST /api/auth/fcm-token: Register mobile device IDs.
GET /api/properties: Optimized for lat/lng radius searches.
GET /api/movers: Filterable relocation directory.
To-Do for Mobile Launch:
Firebase Project: Create a Firebase project and link it to this GCP project ID.
Service Account: Ensure the Cloud Run service account has roles/firebase.messagingAdmin (done in Step 1).
App-Utils: Use the registerFcmToken helper in the React Native login flow to enable push notifications for inquiries and viewing requests.
KejaApp Operations Guide v1.0 | Google Cloud Architecture
