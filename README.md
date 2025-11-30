# Material Management System

A modern material management application built with Next.js 15, React 19.2, React Compiler, and Firebase.

## Features

- ✅ **Next.js 15** with App Router
- ✅ **React 19.2** with React Compiler for optimized performance
- ✅ **TypeScript** for type safety
- ✅ **Tailwind CSS** for styling
- ✅ **Firebase Integration**:
  - Firestore for database
  - Firebase Hosting for deployment
  - Authentication ready
- ✅ **Material Management Interface**:
  - Add new materials
  - View materials inventory
  - Delete materials
  - Real-time updates

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase account

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Firebase**
   
   a. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   
   b. Enable Firestore Database
   
   c. Enable Firebase Hosting
   
   d. Get your Firebase configuration from Project Settings > General > Your apps
   
   e. Copy `.env.local.example` to `.env.local` and fill in your Firebase config:
   ```bash
   cp .env.local.example .env.local
   ```
   
   f. Update `.env.local` with your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. **Initialize Firebase in your project**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init
   ```
   
   Select:
   - Firestore: Configure rules and indexes files
   - Hosting: Configure files for Firebase Hosting

4. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the application.

## Deployment

### Deploy to Firebase Hosting

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   npm run firebase:deploy
   ```

   Or manually:
   ```bash
   firebase deploy
   ```

## Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   │   └── MaterialList.tsx # Main material management component
│   └── lib/
│       └── firebase.ts      # Firebase configuration
├── firebase.json            # Firebase hosting configuration
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Firestore indexes
├── next.config.ts          # Next.js configuration with React Compiler
└── .env.local.example      # Environment variables template
```

## Key Technologies

### React Compiler
This project uses React Compiler (experimental) for automatic optimization. It's enabled in `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
  },
  // ... other config
};
```

### Firebase Integration
- **Firestore**: NoSQL database for storing materials data
- **Firebase Hosting**: Static hosting for the Next.js app
- **Authentication**: Ready for user authentication (can be enabled as needed)

### Next.js Configuration
The app is configured for static export to work with Firebase Hosting:

```typescript
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run export` - Build and export static files
- `npm run firebase:deploy` - Build and deploy to Firebase

## Security

The Firestore security rules are configured to require authentication:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Note**: For development, you may want to temporarily allow unauthenticated access by changing the rule to `allow read, write: if true;`. Remember to implement proper authentication before production deployment.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
