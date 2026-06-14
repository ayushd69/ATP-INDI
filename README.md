# ATP-INDI

A full-stack stock trading simulator with live market updates, order matching, portfolio management, and admin controls.


## admin mail:admin@gmail.com
## pass:admin123

## Project Overview

This repository contains two main applications:

- `BACKEND/` - Node.js + Express API server with MongoDB persistence, Socket.IO live stock updates, and an order matching engine.
- `FRONTEND/` - React + Vite web client for user authentication, stock browsing, portfolio management, watchlists, and trading.

## Features

- User registration and login
- Admin login and market controls
- Live stock price updates using Socket.IO
- Order creation and matching engine for buy/sell orders
- Portfolio view with holdings and wallet balance
- Watchlist and transaction history
- Stock details with historical price updates

## Technologies

- Backend: Node.js, Express, MongoDB, Mongoose, Socket.IO, dotenv
- Frontend: React, Vite, Tailwind CSS, Axios, Zustand, React Router, React Hook Form

## Getting Started

### Backend Setup

1. Open a terminal in `BACKEND/`
2. Install dependencies:

```bash
cd BACKEND
npm install
```

3. Create a `.env` file with the following variables if needed:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ind_pro
FRONTEND_URL=http://localhost:5173
VITE_API_BASE=http://localhost:5000
ADMIN_EMAIL=admine@gmail.com
ADMIN_PASSWORD=admine123
```

4. Run the backend server:

```bash
npm start
```

The server listens on `http://localhost:5000` by default and will seed an admin account and stock data on startup.

### Frontend Setup

1. Open a terminal in `FRONTEND/`
2. Install dependencies:

```bash
cd FRONTEND
npm install
```

3. Create a `.env` file for the frontend if needed:

```env
VITE_API_BASE=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

4. Run the frontend app:

```bash
npm run dev
```

The app runs on `http://localhost:5173` by default.

## Running the App

1. Start MongoDB
2. Start the backend server (`BACKEND/npm start`)
3. Start the frontend app (`FRONTEND/npm run dev`)
4. Open the frontend URL in your browser





