# Material Management System

A comprehensive material management application built with Next.js, Firebase Authentication, and Firestore. Features include user authentication, material inventory management, requisition workflow, shipment tracking, and a real-time notification system.

## Features

- 🔐 **Complete Authentication System**
  - Email/password authentication
  - Google Sign-In integration
  - Password reset functionality
  - User profile management
  - Protected routes

- 📦 **Material Management**
  - Add, view, and delete materials
  - User-specific inventory
  - Real-time data with Firestore
  - Responsive design

- 📋 **Requisition Management**
  - Create and submit requisitions
  - Approval workflow
  - Priority levels and status tracking
  - Multi-item requisitions with detailed specifications

- 🚚 **Shipment Tracking**
  - Create and track shipments
  - Issue reporting system
  - Status updates and delivery tracking
  - Carrier and route management

- 🔔 **Real-time Notification System**
  - In-app notification bell with unread count
  - Event-driven notifications for:
    - Requisition submitted
    - Requisition approved/rejected
    - Shipment issues created
  - Mark as read functionality
  - Real-time updates with Firestore listeners

- 🎨 **Modern UI/UX**
  - Clean, responsive design with Tailwind CSS
  - Loading states and error handling
  - Intuitive navigation
  - Mobile-friendly interface

## Tech Stack

- **Frontend**: Next.js 16.0.6 with TypeScript
- **Authentication**: Firebase Auth
- **Database**: Cloud Firestore
- **Styling**: Tailwind CSS
- **Deployment**: Firebase Hosting

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Authentication and Firestore enabled

### Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password and Google providers
3. Enable Cloud Firestore
4. Get your Firebase configuration from Project Settings

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd materialmanagement
```

2. Install dependencies:
```bash
npm install
```

3. Create environment variables:
```bash
cp .env.local.example .env.local
```

4. Update `.env.local` with your Firebase configuration:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Authentication Flow

### Available Routes

- `/` - Home page with material management (requires authentication)
- `/requisitions` - Requisition management page (requires authentication)
- `/shipments` - Shipment tracking page (requires authentication)
- `/auth/login` - Sign in page
- `/auth/signup` - Sign up page
- `/auth/reset-password` - Password reset page
- `/auth/profile` - User profile page (requires authentication)

### Authentication Features

- **Email/Password**: Traditional authentication with validation
- **Google Sign-In**: One-click authentication with Google
- **Password Reset**: Email-based password recovery
- **Protected Routes**: Automatic redirection for unauthenticated users
- **User Profile**: Update display name and view account information

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── auth/              # Authentication pages
│   ├── requisitions/      # Requisition management pages
│   ├── shipments/         # Shipment tracking pages
│   ├── layout.tsx         # Root layout with AuthProvider
│   └── page.tsx           # Home page with materials
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── notifications/    # Notification system components
│   ├── requisitions/     # Requisition management components
│   ├── shipments/        # Shipment tracking components
│   ├── ui/               # UI components
│   ├── MaterialList.tsx  # Main material management component
│   └── Navigation.tsx    # Navigation bar with notification bell
├── contexts/             # React contexts
│   └── AuthContext.tsx   # Authentication context
├── hooks/                # Custom React hooks
│   ├── useAuth.ts        # Authentication hooks
│   └── useNotifications.ts # Notification hooks
├── lib/                  # Utility libraries
│   ├── firebase.ts       # Firebase configuration
│   ├── auth-utils.ts     # Authentication utilities
│   ├── notification-service.ts # Notification management
│   ├── requisition-service.ts  # Requisition management
│   └── shipment-service.ts     # Shipment management
└── types/                # TypeScript type definitions
    ├── auth.ts           # Authentication types
    ├── notification.ts   # Notification types
    ├── requisition.ts    # Requisition types
    └── shipment.ts       # Shipment types
```

## Firebase Security Rules

Make sure to set up proper Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own materials
    match /materials/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## Deployment

### Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project:
```bash
firebase init hosting
```

4. Build and deploy:
```bash
npm run build
firebase deploy
```

### Environment Variables for Production

Make sure to set your environment variables in your hosting platform:
- Vercel: Add them in the Vercel dashboard
- Netlify: Add them in site settings
- Firebase: Use Firebase Functions config

## Notification System

The application includes a comprehensive real-time notification system that keeps users informed about important events:

### Features

- **Real-time Updates**: Notifications appear instantly using Firestore real-time listeners
- **Notification Bell**: Visual indicator in the navigation bar with unread count badge
- **Dropdown Interface**: Clean, organized list of notifications with priority indicators
- **Mark as Read**: Individual and bulk mark-as-read functionality
- **Event-driven**: Automatically triggered by business events

### Notification Types

1. **Requisition Submitted** - When a user submits a requisition for review
2. **Requisition Approved** - When a requisition is approved by a manager
3. **Requisition Rejected** - When a requisition is rejected
4. **Shipment Issue Created** - When an issue is reported for a shipment
5. **Shipment Delivered** - When a shipment is marked as delivered
6. **Material Low Stock** - When material inventory falls below threshold

### How It Works

1. **Event Triggers**: Business actions (submit requisition, report issue, etc.) trigger notification creation
2. **Service Layer**: `NotificationService` handles all CRUD operations and real-time subscriptions
3. **Real-time Updates**: Firestore listeners provide instant updates to the UI
4. **User Interface**: `NotificationBell` component displays count and dropdown with notifications
5. **Data Security**: Firestore rules ensure users only see their own notifications

### Usage Example

```typescript
// Create a notification when a requisition is submitted
await NotificationService.createRequisitionSubmittedNotification(
  userId,
  requisitionId,
  requisitionTitle
);

// Subscribe to real-time notifications in a component
const { notifications, stats, markAsRead } = useNotifications();
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.
