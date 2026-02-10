# SpendLens — Splitwise Analytics Dashboard

A premium expense analytics dashboard powered by the Splitwise API. Visualize your shared expenses, track balances, and gain deep insights into your spending patterns.

## Features

Inspired by top expense tracking apps (Expensify, Monarch Money, YNAB, Simplifi):

- **Dashboard Overview** — Net balance, amounts owed/owing, total expense share
- **Monthly Spending Trends** — Area chart showing your share vs what you paid over time
- **Category Breakdown** — Donut chart with percentage splits across categories  
- **Day of Week Analysis** — When do you spend the most?
- **Group Analytics** — Deep dive into any Splitwise group with:
  - Group total spend, your share, average per person
  - Member-by-member breakdown with progress bars
  - Category breakdown per group
  - Full expense timeline
  - Top payers leaderboard
- **Friend Balances** — Visual bar chart of all balances, split into who owes you vs who you owe
- **Configurable** — API key, user ID, and base URL all configurable via `.env`

## Tech Stack

- **React 18** + Vite
- **Recharts** for charts
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **date-fns** for date formatting

## Setup

```bash
cd splitwise-dashboard
npm install
```

### Configure

The `.env` file is pre-configured with your API key. To change:

```
VITE_SPLITWISE_API_KEY=your_api_key
VITE_SPLITWISE_BASE_URL=https://secure.splitwise.com/api/v3.0
VITE_SPLITWISE_USER_ID=your_user_id
```

Get your API key from: https://secure.splitwise.com/oauth_clients

### Run

```bash
npm run dev
```

Open http://localhost:5173

## API Endpoints Used

| Endpoint | Description |
|---|---|
| `GET /get_current_user` | Current user info |
| `GET /get_groups` | All groups with balances |
| `GET /get_friends` | Friends with balances |
| `GET /get_expenses` | Expenses with filters |
| `GET /get_group/{id}` | Group details |
| `GET /get_categories` | Expense categories |

## CORS Note

The Splitwise API doesn't support CORS for browser requests. Vite's dev server is configured with a proxy to handle this. For production, you'll need a backend proxy or use the Splitwise JS SDK with a server component.

## License

Personal use only.
