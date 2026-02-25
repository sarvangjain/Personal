# Claude Limit Reset Notifier

A web app to notify you 5 minutes before your Claude limit resets - on both your laptop and phone!

## Features

- **Flexible time parsing** - "Resets 2:30 PM" or "Resets in 3 hr 9 min"
- **Phone notifications** - Get notified via [ntfy.sh](https://ntfy.sh) even when laptop is closed
- **Cross-device sync** - Set notification on laptop, get notified on phone
- **Browser notifications** - Also get notified in browser when tab is open
- **Countdown timer** - Live countdown to notification time

## Setup Phone Notifications

1. Install the [ntfy app](https://ntfy.sh) on your phone (iOS/Android)
2. Choose a unique topic name (e.g., `claude-yourname-123`)
3. Subscribe to that topic in the ntfy app
4. Enter the same topic name in the web app

## Deploy to Netlify

### Option 1: CLI (Recommended)

```bash
cd limit-notifier
npm install
npx netlify-cli login
npx netlify-cli deploy --prod
```

### Option 2: Git Integration

1. Push this folder to a GitHub repo
2. Go to [Netlify](https://app.netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub repo
5. Deploy!

## How It Works

1. **Frontend** - Clean UI to input reset times
2. **Netlify Functions** - Backend API to store notifications
3. **Netlify Blobs** - Persistent storage for notification data
4. **Scheduled Function** - Runs every minute to check and send due notifications
5. **ntfy.sh** - Free push notification service for phone alerts

## Local Development

```bash
npm install
npx netlify-cli dev
```

This runs both the frontend and functions locally.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Browser   │────▶│ Netlify Function │────▶│ ntfy.sh API │
│   (You)     │     │   (Backend)      │     │  (Phone)    │
└─────────────┘     └──────────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Netlify Blob │
                    │  (Storage)   │
                    └──────────────┘
```

## Note

The scheduled function runs every minute to check for due notifications. This means notifications may arrive up to ~1 minute after the exact time, but typically within seconds.
