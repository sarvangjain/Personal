# MF Tracker

A lightweight React app to track Indian mutual funds and monitor NAV changes.

## Features

- Search mutual funds using MFAPI
- Add funds to your watchlist
- Track weekly and monthly NAV changes
- Color-coded indicators (green for gains, red for drops)
- Data persisted in browser LocalStorage

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- MFAPI (https://api.mfapi.in)

## API

This app uses the free [MFAPI](https://www.mfapi.in/) for mutual fund data:

- No authentication required
- Updated 6x daily
- 10,000+ mutual fund schemes
