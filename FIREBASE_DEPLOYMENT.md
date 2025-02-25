# Firebase Deployment with GitHub Actions

This document explains how to set up automated deployments to Firebase Hosting using GitHub Actions.

## Setup Instructions

### 1. Firebase Service Account Setup

To allow GitHub Actions to deploy to Firebase, you need to create a Firebase Service Account:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`ptcl-incident-mgmt`)
3. Go to Project Settings > Service accounts
4. Click "Generate new private key" for Firebase Admin SDK
5. Save the JSON file securely (you'll need it for the next step)

### 2. GitHub Secrets Configuration

Add the following secrets to your GitHub repository:

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add the following secrets:

   - `FIREBASE_SERVICE_ACCOUNT`: Paste the entire content of the Firebase service account JSON file
   - `NEXT_PUBLIC_FIREBASE_API_KEY`: Your Firebase API key
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Your Firebase auth domain
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Your Firebase project ID
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase messaging sender ID
   - `NEXT_PUBLIC_FIREBASE_APP_ID`: Your Firebase app ID

You can find these values in your Firebase project settings or in your `.env.local` file.

### 3. Workflow Configuration

The GitHub Actions workflow is already configured in `.github/workflows/firebase-deploy.yml`. It will:

- Automatically deploy when you push changes to the `main` branch
- Only trigger when relevant files change (app, components, pages, etc.)
- Cache dependencies and build files for faster deployments
- Use the Firebase service account for authentication

### 4. Manual Deployment

If you need to manually trigger a deployment:

1. Go to your GitHub repository
2. Navigate to Actions > "Deploy to Firebase Hosting" workflow
3. Click "Run workflow" and select the branch to deploy

## Troubleshooting

If you encounter issues with the deployment:

1. Check the GitHub Actions logs for error messages
2. Verify that all required secrets are correctly set up
3. Ensure your Firebase configuration in `firebase.json` and `.firebaserc` is correct
4. Make sure your Next.js build is generating the static export correctly

## Local Development

You can still use the manual deployment process locally:

```bash
# Build the Next.js app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Make sure you're logged in to Firebase CLI locally using `firebase login`. 