# Material Management System

A modern material management application built with Next.js, Firebase Authentication, and Firestore. Features include user authentication with Google Sign-In, email/password authentication, password reset functionality, and user-specific material inventory management.

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

- `/` - Home page (requires authentication)
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
│   ├── layout.tsx         # Root layout with AuthProvider
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── ui/               # UI components
│   ├── MaterialList.tsx  # Main material management component
│   └── Navigation.tsx    # Navigation bar
├── contexts/             # React contexts
│   └── AuthContext.tsx   # Authentication context
├── hooks/                # Custom React hooks
│   └── useAuth.ts        # Authentication hooks
├── lib/                  # Utility libraries
│   ├── firebase.ts       # Firebase configuration
│   └── auth-utils.ts     # Authentication utilities
└── types/                # TypeScript type definitions
    └── auth.ts           # Authentication types
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
