# Pet Monitor

A progressive web application for live video streaming between devices with motion detection, push notifications, and local recording.

## Features

- **Live Video Streaming**: Stream from one phone to multiple viewers using WebRTC
- **Motion Detection**: Real-time motion detection with configurable sensitivity
- **Push Notifications**: Get alerted on any device when motion is detected
- **Local Recording**: Automatically record clips when motion is detected
- **PWA Support**: Install as a native app on mobile devices
- **Multiple Viewers**: Support up to 5 simultaneous viewers

## Tech Stack

- React 18 + TypeScript + Vite
- PeerJS (WebRTC) for P2P video streaming
- Firebase Cloud Messaging for push notifications
- IndexedDB for local recording storage
- Tailwind CSS for styling
- Vercel for deployment

## Setup

### Prerequisites

- Node.js 18+ 
- Firebase project with Cloud Messaging enabled

### Installation

```bash
npm install
```

### Firebase Configuration

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Cloud Messaging
3. Get your web app configuration and server key
4. Copy `.env.example` to `.env` and fill in your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_VAPID_KEY=your-vapid-key
FIREBASE_SERVER_KEY=your-server-key
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

## Deployment to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - All `VITE_FIREBASE_*` variables
   - `FIREBASE_SERVER_KEY` for the API function

4. Deploy!

## Usage

### Camera Mode

1. Open the app on your phone
2. Tap "Start Camera"
3. Grant camera and microphone permissions
4. Share the 6-digit room code with viewers
5. Configure motion detection sensitivity in settings

### Viewer Mode

1. Open the app on any device
2. Tap "Join as Viewer"
3. Enter the 6-digit room code
4. Allow notifications for motion alerts

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PeerJS Cloud Server                       │
│                   (Free Signaling Server)                    │
└─────────────────────┬───────────────────────────────────────┘
                      │ Signaling
         ┌────────────┴────────────┐
         │                         │
┌────────▼────────┐       ┌────────▼────────┐
│  Camera Device  │◄─────►│  Viewer Device  │
│   (Mobile)      │ WebRTC│   (Any Device)  │
│                 │ P2P   │                 │
│ - Capture video │       │ - Display stream│
│ - Motion detect │       │ - Receive alerts│
│ - Send stream   │       │ - Audio control │
└─────────────────┘       └─────────────────┘
```

## License

MIT
