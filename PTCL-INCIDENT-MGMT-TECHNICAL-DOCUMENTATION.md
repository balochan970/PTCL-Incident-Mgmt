# PTCL Incident Management System - Technical Documentation

## Project Overview

The PTCL Incident Management System is a Next.js application designed to track and manage network incidents for Pakistan Telecommunication Company Limited (PTCL). The system allows authorized users to create, track, and report on various types of network faults, including GPON (Gigabit Passive Optical Network) and Switch/Metro faults.

### Key Features

- **User Authentication**: Secure login system with role-based access
- **Incident Creation**: Forms for creating single, multiple, and GPON-specific faults
- **Active Fault Monitoring**: Real-time view of ongoing incidents
- **Reporting**: Generate and view reports on historical incidents
- **Public Access**: Limited view of active faults for unauthenticated users
- **Knowledge Base**: Repository of troubleshooting information

### Technology Stack

- **Frontend**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Custom authentication using Firebase Firestore and bcryptjs
- **Hosting**: Firebase Hosting
- **CI/CD**: GitHub Actions

## Authentication System

The application implements a robust authentication system with the following features:

### Session Management

- **Session Persistence**: Authentication state is stored in both sessionStorage and cookies
- **Session Duration**: Sessions expire after 24 hours of inactivity
- **Cross-Tab Synchronization**: Authentication state is synchronized across browser tabs
- **Automatic Logout**: Users are automatically logged out when their session expires

### Authentication Flow

1. **Login Process**:
   - User enters credentials on the login page
   - Credentials are verified against the Firebase Firestore `auth_users` collection
   - Upon successful authentication, session data is stored in sessionStorage and cookies
   - User is redirected to the home page or their original destination

2. **Authentication Verification**:
   - Every protected route checks for valid authentication via middleware
   - The middleware verifies the presence and validity of the auth cookie
   - If authentication is invalid, the user is redirected to the login page
   - The original URL is preserved as a redirect parameter

3. **Logout Process**:
   - User clicks the logout button in the navigation bar
   - All authentication data is cleared from sessionStorage and cookies
   - Authentication state change is broadcast to all open tabs
   - User is redirected to the login page

### Implementation Details

- **AuthContext**: React context provider that manages authentication state
- **authService**: Service module that handles authentication operations
- **Middleware**: Next.js middleware that protects routes from unauthorized access
- **Suspense Boundaries**: Components using client-side hooks like `useSearchParams()` are wrapped in Suspense boundaries

### Security Considerations

- **Password Hashing**: Passwords are stored as bcrypt hashes, not plaintext
- **Session Storage**: Authentication data is primarily stored in sessionStorage (cleared when browser is closed)
- **Cookie Security**: Cookies use SameSite=strict and are HTTP-only where possible
- **CSRF Protection**: Form submissions include CSRF protection via Next.js built-in mechanisms

## Routing & Navigation

### Route Structure

The application uses Next.js App Router with the following route structure:

- **Public Routes**:
  - `/login`: Authentication page
  - `/active-faults`: Publicly accessible view of current faults

- **Protected Routes**:
  - `/` (Root): Redirects to home page for authenticated users
  - `/home`: Dashboard for authenticated users
  - `/single-fault`: Form for creating individual incidents
  - `/multiple-faults`: Form for creating multiple related incidents
  - `/gpon-faults`: Form for creating GPON-specific incidents
  - `/reports`: View and generate reports for switch/metro incidents
  - `/gpon-reports`: View and generate reports for GPON incidents
  - `/knowledgebase`: Access troubleshooting information

### Navigation Components

The main navigation is handled by the `NavBar` component (`app/components/NavBar.tsx`), which provides links to all major sections of the application. The navigation bar is fixed at the top of the screen and is responsive to different screen sizes.

### Route Protection

Route protection is implemented in the `middleware.ts` file, which:

1. Intercepts all requests to the application
2. Checks for the presence and validity of authentication cookies
3. Redirects unauthenticated users to the login page when they attempt to access protected routes
4. Allows access to public routes without authentication
5. Redirects authenticated users away from the login page

```typescript
// Excerpt from middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the path is protected
  const isProtectedRoute = protectedRoutes.includes(pathname);
  const isPublicRoute = publicRoutes.includes(pathname);

  // Get auth cookie
  const authCookie = request.cookies.get('auth');
  let isAuthenticated = false;

  // Verify authentication
  if (authCookie?.value) {
    try {
      const authData = JSON.parse(authCookie.value);
      isAuthenticated = authData.isAuthenticated && authData.username && authData.role;
    } catch {
      isAuthenticated = false;
    }
  }

  // Handle protected routes
  if (isProtectedRoute) {
    if (!isAuthenticated) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      return clearAuthCookies(response);
    }
    return NextResponse.next();
  }
  
  // Additional route handling...
}
```

## Incident Management System

### Incident Types

The system handles three main types of incidents:

1. **Single Faults**: Individual network incidents (Switch/Metro)
2. **Multiple Faults**: Related incidents affecting multiple network elements
3. **GPON Faults**: Fiber optic network incidents with specific attributes

### Incident Creation Process

#### Single/Multiple Fault Creation:

1. User fills out the incident form with details like:
   - Exchange name
   - Affected nodes
   - Stakeholders
   - Fault type
   - Equipment type
   - Domain

2. Form submission triggers an API call to `/api/create-incident`
3. The API validates the data and checks for duplicates
4. A unique incident number is generated using a counter in Firestore
5. The incident is stored in the `incidents` collection
6. The user receives confirmation with the incident number

#### GPON Fault Creation:

1. User fills out the GPON-specific form with details like:
   - Exchange name
   - FDH (Fiber Distribution Hub)
   - FAT (Fiber Access Terminal)
   - OLT IP (Optical Line Terminal)
   - FSP (Frame, Slot, Port)

2. Form submission triggers an API call to `/api/create-gpon-incidents`
3. The API validates the data and checks for duplicates
4. Unique incident numbers are generated for each GPON fault
5. The incidents are stored in the `gponIncidents` collection
6. The user receives confirmation with the incident numbers

### Duplicate Prevention

The system implements multiple layers of duplicate prevention:

1. **Client-Side Debouncing**: Prevents multiple rapid submissions
2. **In-Memory Caching**: Tracks recent submissions on both client and server
3. **Database Checks**: Verifies against recent Firestore entries
4. **Submission Hashing**: Creates unique identifiers for submissions

This is documented in detail in `IMPLEMENTATION_SUMMARY.md`.

## Database Structure

### Firestore Collections

The application uses the following Firestore collections:

1. **`auth_users`**:
   - Stores user authentication information
   - Fields: `username`, `password` (hashed), `role`

2. **`incidents`** (Switch/Metro faults):
   - Fields:
     - `incidentNumber`: Unique identifier (e.g., IM000123)
     - `exchangeName`: Location of the incident
     - `nodes`: Object containing nodeA, nodeB, etc.
     - `stakeholders`: Array of affected stakeholders
     - `faultType`: Type of network fault
     - `equipmentType`: Affected equipment
     - `domain`: Network domain
     - `status`: Current status (In Progress, Resolved, etc.)
     - `timestamp`: When the incident was created
     - `faultEndTime`: When the incident was resolved (if applicable)
     - `ticketGenerator`: User who created the incident
     - `isMultipleFault`: Boolean indicating if part of multiple faults
     - `outageNodes`: Object tracking which nodes have outages

3. **`gponIncidents`** (GPON faults):
   - Fields:
     - `incidentNumber`: Unique identifier (e.g., GIM000123)
     - `exchangeName`: Location of the incident
     - `fdh`: Fiber Distribution Hub identifier
     - `fats`: Array of Fiber Access Terminals
     - `oltIp`: Optical Line Terminal IP address
     - `fsps`: Array of Frame/Slot/Port identifiers
     - `stakeholders`: Array of affected stakeholders
     - `status`: Current status
     - `timestamp`: When the incident was created
     - `isOutage`: Boolean indicating if this is a complete outage
     - `ticketGenerator`: User who created the incident

4. **`incidentCounters`** and **`counters`**:
   - Used to generate sequential incident numbers
   - Contains counters for different incident types

### Query Patterns

The application uses several common query patterns:

1. **Authentication Queries**:
   ```typescript
   const q = query(authUsersRef, where('username', '==', trimmedUsername));
   ```

2. **Active Faults Queries**:
   ```typescript
   const q = query(
     faultsRef,
     where('status', 'in', ['In Progress', 'Pending', /* other statuses */])
   );
   ```

3. **Duplicate Prevention Queries**:
   ```typescript
   const q = query(
     incidentsRef,
     where('exchangeName', '==', exchangeName),
     where('faultType', '==', faultType),
     where('timestamp', '>=', fiveMinutesAgo)
   );
   ```

## API Interactions

### Internal API Routes

The application includes several API routes for server-side operations:

1. **`/api/create-incident`**:
   - Creates single or multiple switch/metro incidents
   - Implements duplicate prevention
   - Generates unique incident numbers

2. **`/api/create-gpon-incidents`**:
   - Creates GPON-specific incidents
   - Handles multiple FATs and FSPs
   - Implements duplicate prevention

3. **`/api/send-whatsapp`** (if implemented):
   - Integrates with WhatsApp for notifications
   - Sends alerts to stakeholders

### Client-Side Services

The application includes client-side service modules:

1. **`app/services/incidentService.ts`**:
   - Provides methods for incident creation
   - Implements client-side duplicate prevention
   - Handles error states and loading states

2. **`app/hooks/useFormSubmission.ts`**:
   - Custom React hook for form submissions
   - Implements debouncing
   - Manages loading and error states

## Security Features

### Authentication Security

1. **Password Security**:
   - Passwords are hashed using bcryptjs before storage
   - Password comparison is done securely without exposing the hash

2. **Route Protection**:
   - Middleware intercepts all requests to protected routes
   - Authentication state is verified on both client and server

3. **Session Management**:
   - Sessions expire after 24 hours
   - Authentication state is stored in both localStorage and cookies
   - Cookies are cleared on logout or session expiry

### Data Security

1. **Input Validation**:
   - All form inputs are validated before submission
   - API routes implement server-side validation

2. **Duplicate Prevention**:
   - Prevents malicious repeated submissions
   - Implements rate limiting through debouncing

3. **Firebase Security Rules** (assumed):
   - Firestore security rules should restrict access to collections
   - Only authenticated users can write to incident collections

## Deployment Process

### Manual Deployment

The application can be deployed manually using the provided script:

```bash
npm run deploy
```

This script:
1. Checks if the user is logged in to Firebase
2. Installs dependencies
3. Runs linting
4. Builds the Next.js app
5. Deploys to Firebase Hosting

### Automated Deployment with GitHub Actions

The application uses GitHub Actions for CI/CD, configured in `.github/workflows/firebase-deploy.yml`:

1. **Trigger**:
   - Pushes to the `main` branch
   - Changes to specific directories (app, components, lib, etc.)
   - Manual workflow dispatch

2. **Build Process**:
   - Checkout repository
   - Setup Node.js environment
   - Cache dependencies and build files
   - Install dependencies
   - Run ESLint
   - Build Next.js app with environment variables

3. **Deployment**:
   - Deploy to Firebase Hosting using the Firebase GitHub Action
   - Use Firebase service account for authentication
   - Deploy to the live channel
   - Target the `rocktr2` hosting target

### Environment Variables

The deployment process uses several environment variables stored as GitHub Secrets:

- `FIREBASE_SERVICE_ACCOUNT`: Service account credentials
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Firebase project ID
- And other Firebase configuration variables

## Code Structure & Key Files

### Directory Structure

```
/
├── app/                      # Next.js application code
│   ├── api/                  # API routes
│   ├── components/           # Shared React components
│   ├── hooks/                # Custom React hooks
│   ├── services/             # Service modules
│   ├── [feature]/            # Feature-specific pages
│   └── layout.tsx            # Root layout
├── lib/                      # Utility functions
│   ├── firebaseConfig.ts     # Firebase initialization
│   └── utils/                # Utility functions
├── public/                   # Static assets
├── scripts/                  # Utility scripts
│   └── deploy.js             # Deployment script
├── .github/workflows/        # GitHub Actions workflows
├── firebase.json             # Firebase configuration
├── .firebaserc               # Firebase project configuration
└── next.config.js            # Next.js configuration
```

### Key Files

1. **`middleware.ts`**:
   - Handles route protection and authentication verification
   - Manages redirects for unauthenticated users

2. **`app/login/page.tsx`**:
   - Implements the login form and authentication logic
   - Manages authentication state

3. **`app/page.tsx`**:
   - Root page that redirects to home for authenticated users
   - Verifies authentication state

4. **`app/active-faults/page.tsx`**:
   - Public page showing active incidents
   - Implements conditional UI based on entry point

5. **`app/components/NavBar.tsx`**:
   - Main navigation component
   - Provides links to all major sections

6. **`lib/firebaseConfig.ts`**:
   - Initializes Firebase and exports Firestore instance

7. **`app/services/incidentService.ts`**:
   - Provides methods for incident creation and management

## Performance Optimization

### Current Optimizations

1. **Build Caching**:
   - GitHub Actions workflow caches dependencies and build files
   - Speeds up deployment process

2. **Suspense Boundaries**:
   - Client-side components use Suspense for better loading states
   - Improves perceived performance

3. **Duplicate Prevention**:
   - In-memory caching reduces database queries
   - Debouncing prevents unnecessary API calls

### Potential Improvements

1. **Image Optimization**:
   - Implement Next.js Image component for optimized images
   - Add responsive images for different screen sizes

2. **Code Splitting**:
   - Further optimize bundle size with dynamic imports
   - Lazy load non-critical components

3. **Server-Side Rendering**:
   - Evaluate which pages would benefit from SSR vs. CSR
   - Implement hybrid rendering strategy

4. **Firestore Indexing**:
   - Review and optimize Firestore indexes for common queries
   - Add composite indexes for complex queries

5. **Caching Strategy**:
   - Implement SWR or React Query for data fetching
   - Add caching for frequently accessed data

## Conclusion

The PTCL Incident Management System is a comprehensive Next.js application for tracking and managing network incidents. It leverages Firebase for data storage and authentication, with a clean, responsive UI built using Tailwind CSS. The system includes robust security features, duplicate prevention mechanisms, and is deployed using GitHub Actions for CI/CD.

The modular architecture allows for easy maintenance and extension, while the performance optimizations ensure a smooth user experience. The system successfully balances the need for security (protected routes) with accessibility (public active faults page). 