# PTCL Incident Management System

A comprehensive Next.js application for managing PTCL network incidents, deployed on Firebase Hosting. This system provides real-time incident tracking, fault management, and reporting capabilities for network operations.

## Core Features

### Incident Management
- Single Fault Management
  - Create and track individual network incidents
  - Real-time status updates and timeline tracking
  - Detailed fault notes and history
  - Location mapping and visualization
  - Template-based incident creation

- Multiple Faults Management
  - Batch incident creation and tracking
  - Bulk status updates
  - Consolidated view of related incidents

- GPON Faults Management
  - Specialized handling of GPON network issues
  - Fiber path tracking
  - Node-level fault management

### Fault Analytics and Reporting
- Active Faults Dashboard
  - Real-time monitoring of ongoing incidents
  - Color-coded duration tracking (2-4h, 4-8h, 8h+)
  - Theme-based visualization
  - Status filtering and sorting

- Comprehensive Reports
  - Customizable date range reporting
  - Export capabilities
  - Analytics and trends visualization
  - GPON-specific reports

### Location and Network Management
- Interactive Map Integration
  - Fault location visualization
  - Geographic distribution analysis
  - Network path mapping

- Network Components
  - Fiber paths management
  - Node tracking
  - Contact information management

### System Features
- User Authentication and Authorization
  - Role-based access control
  - Secure login system
  - Admin user management

- Knowledge Base
  - Documentation repository
  - Troubleshooting guides
  - Best practices

- WhatsApp Integration
  - Automated notifications
  - Status updates via WhatsApp
  - Team communication

## Technical Architecture

### Frontend Components
- Modern React components with TypeScript
- Tailwind CSS for styling
- Responsive design for all devices
- Real-time data synchronization

### Backend Services
- Firebase Authentication
- Firestore Database
- Firebase Hosting
- Cloud Functions for background tasks

### Key Components
- `NavBar`: Main navigation and theme management
- `StatusBadge`: Visual status indicators
- `FaultAnalytics`: Comprehensive fault analysis
- `TemplatesOverlay`: Template management system
- `Map`: Location visualization
- `MultiSelectDropdown`: Enhanced selection interface
- `StatusTimeline`: Incident progress tracking
- `FaultNotes`: Detailed incident documentation

## Development

### Prerequisites
- Node.js 18 or later
- npm
- Firebase CLI (`npm install -g firebase-tools`)
- Git

### Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
   Create a `.env.local` file with:
   - Firebase configuration
   - API keys
   - WhatsApp integration settings

4. Start the development server:

```bash
npm run dev
```

## Deployment

### Automated Deployment
- GitHub Actions integration
- Continuous deployment on main branch updates
- Automated testing and building
See [FIREBASE_DEPLOYMENT.md](./FIREBASE_DEPLOYMENT.md) for details.

### Manual Deployment

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

```
├── app/
│   ├── components/      # Reusable React components
│   ├── active-faults/  # Active faults dashboard
│   ├── single-fault/   # Single fault management
│   ├── multiple-faults/# Multiple faults handling
│   ├── gpon-faults/    # GPON specific faults
│   ├── reports/        # Reporting system
│   ├── api/           # API routes
│   ├── services/      # Business logic
│   ├── hooks/         # Custom React hooks
│   └── styles/        # CSS and styling
├── lib/              # Utilities and configurations
├── public/           # Static assets
└── scripts/          # Utility scripts
```

## Contributing

1. Follow the coding standards
2. Write meaningful commit messages
3. Test thoroughly before submitting PRs
4. Update documentation as needed

## License

This project is proprietary and confidential. © PTCL
