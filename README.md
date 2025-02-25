# PTCL Incident Management System

A Next.js application for managing incidents, deployed on Firebase Hosting.

## Features

- Create and manage incidents
- Track incident status
- Generate reports
- User authentication
- Real-time updates

## Development

### Prerequisites

- Node.js 18 or later
- npm
- Firebase CLI (`npm install -g firebase-tools`)

### Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
   - Create a `.env.local` file with your Firebase configuration

4. Start the development server:

```bash
npm run dev
```

## Deployment

### Automated Deployment with GitHub Actions

This project uses GitHub Actions to automatically deploy to Firebase Hosting when changes are pushed to the main branch. See [FIREBASE_DEPLOYMENT.md](./FIREBASE_DEPLOYMENT.md) for setup instructions.

### Manual Deployment

You can deploy manually using the provided script:

```bash
npm run deploy
```

This will:
1. Check if you're logged in to Firebase
2. Install dependencies
3. Run linting
4. Build the Next.js app
5. Deploy to Firebase Hosting

Alternatively, you can run the steps individually:

```bash
# Build the Next.js app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## Project Structure

- `app/`: Next.js application code
- `components/`: React components
- `lib/`: Utility functions and Firebase configuration
- `public/`: Static assets
- `styles/`: CSS styles
- `scripts/`: Utility scripts
- `.github/workflows/`: GitHub Actions workflows

## Firebase Configuration

The Firebase configuration is stored in:
- `firebase.json`: Firebase project configuration
- `.firebaserc`: Firebase project and hosting target configuration

## License

This project is proprietary and confidential.
