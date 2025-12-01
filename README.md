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

## Local Development

### Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Run type checking
npm run type-check

# Run all checks (type-check + lint)
npm run prepare
```

### Development with Docker

If you prefer to use Docker for development:

```bash
# Copy environment file
cp .env.local.example .env.local
# Edit .env.local with your Firebase config

# Start development server with Docker
docker-compose up app-dev

# Access the app at http://localhost:3001
```

### Environment Management

1. **Local Development**: Use `.env.local` file (never commit this)
2. **Production**: Set environment variables in your hosting platform
3. **CI/CD**: Use GitHub repository secrets

#### Environment File Setup
```bash
# Copy the example file
cp .env.local.example .env.local

# Edit with your Firebase configuration
nano .env.local
```

### Code Quality

This project includes several tools to maintain code quality:

- **ESLint**: For code linting and style consistency
- **TypeScript**: For type safety
- **Pre-commit hooks**: Run type checking and linting before commits
- **GitHub Actions**: Automated testing and security checks

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

## CI/CD Pipeline

This project includes a comprehensive CI/CD pipeline using GitHub Actions that automatically:

- **Runs tests and builds** on every push to `main` and `develop` branches
- **Performs security audits** and vulnerability checks
- **Deploys to Firebase Hosting** when code is pushed to `main`
- **Supports manual deployments** to staging and production environments

### GitHub Actions Workflows

#### CI Pipeline (`.github/workflows/ci.yml`)
- Runs on Node.js 18.x and 20.x
- Performs linting, type checking, and builds
- Runs security audits
- Triggers on pushes and pull requests to `main` and `develop`

#### Deployment Pipeline (`.github/workflows/deploy.yml`)
- Automatically deploys to production on `main` branch pushes
- Supports manual deployment to staging environment
- Deploys both the application and Firestore rules

### Required GitHub Secrets

Set up the following secrets in your GitHub repository settings:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_SERVICE_ACCOUNT
FIREBASE_TOKEN
FIREBASE_PROJECT_ID
```

## Deployment Options

### 1. Firebase Hosting (Recommended)

#### Automatic Deployment
- Push to `main` branch triggers automatic deployment
- Manual deployment available via GitHub Actions

#### Manual Deployment
1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Build and deploy:
```bash
npm run firebase:deploy
```

#### Staging Deployment
```bash
npm run firebase:deploy:staging
```

### 2. Docker Deployment

#### Production Build
```bash
docker build -t materialmanagement .
docker run -p 3000:3000 materialmanagement
```

#### Development with Docker Compose
```bash
# Copy environment file
cp .env.local.example .env.local
# Edit .env.local with your Firebase config

# Start development environment
docker-compose up app-dev
```

#### Production with Docker Compose
```bash
docker-compose up app
```

### 3. Other Platforms

#### Vercel
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

#### Netlify
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `out`
4. Add environment variables in site settings

### Environment Variables for Production

Make sure to set your environment variables in your hosting platform:
- **GitHub Actions**: Add as repository secrets
- **Vercel**: Add them in the Vercel dashboard
- **Netlify**: Add them in site settings
- **Docker**: Use `.env` file or environment variables
- **Firebase**: Use Firebase Functions config

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
