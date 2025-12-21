# PonyFun V85 Analysis

A powerful horse racing analysis application designed to predict outcomes for V85 races using real-time data and historical performance metrics.

## 🚀 Features

- **Real-Time Data Integration**: Scrapes upcoming V85 race data from ATG.se and SwedishHorseRacing.com.
- **Advanced Analysis**: Calculates win probabilities based on horse records, rider statistics, and recent form.
- **Interactive Dashboard**:
    - **Bulk Discovery**: Find and load all future V85 rounds with a single click.
    - **Collapsible Rounds**: Organize your view by expanding/collapsing venue sections.
    - **Persistent State**: Remembers your expanded sections as you navigate.
- **Detailed Race Views**:
    - Complete start lists with calculated "Edge" (Value vs. Market).
    - Sequential prediction ranking (1st, 2nd, 3rd...).
    - Easy navigation between legs (Race 1-8).

## 🛠 Tech Stack

- **Frontend**: Angular 21, TypeScript, CSS (Premium styling).
- **Backend**: Node.js, Express.
- **Database**: SQLite3.
- **Infrastructure**: Docker, Docker Compose, Nginx.

## 🐳 Quick Start (Docker)

The easiest way to run the application is with Docker Compose.

```bash
# Build and start the services
docker compose up --build
```

- **Frontend**: [http://localhost:4201](http://localhost:4201)
- **Backend API**: [http://localhost:3005](http://localhost:3005)

## 🔧 Manual Setup

If you prefer running locally without Docker:

### Backend
```bash
cd backend
npm install
node index.js
```
The server runs on port `3005`.

### Frontend
```bash
cd frontend
npm install
ng serve
```
The application runs on port `4201`.

## 🧪 Analysis Logic

The application uses a custom algorithm to calculate win probabilities:
1.  **Horse Record**: Win rate in Auto/Volt start methods.
2.  **Rider Stats**: Driver's win percentage and experience.
3.  **Recent Form**: Weighted score based on last 5 performances.
4.  **Earnings**: Total earnings as a proxy for class.

These factors are combined to generate a `Calculated Win %` which is then compared against the market (`V85 %`) to identify "Edge" (betting value).
