
# Admin Dashboard - Stock Trading Simulator

## Overview
The modern Admin Dashboard provides comprehensive management and monitoring tools for the stock trading simulator. Built with React.js and Tailwind CSS with a dark finance-style UI.

 Configure environment variables in `.env`:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ind_pro
   ADMIN_EMAIL=admine@gmail.com
   ADMIN_PASSWORD=admine123
   ```

   ```

2. Configure environment variables in `.env`:
   ```
   VITE_API_BASE=http://localhost:5000
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```

## Authentication

### Admin Login
1. Click on the "Admin" button in the login panel
2. Use credentials from `.env`:
   - Email: `admine@gmail.com`
   - Password: `admine123` (configured in .env, not hardcoded)

### Security Best Practices
- Admin credentials are now read from environment variables
- Password is never exposed in client-side code
- All credentials are hashed using bcrypt on the backend


## API Endpoints

### Admin Endpoints
- `POST /api/admin/register` - Create new admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/market/state` - Get market state
- `POST /api/admin/market/toggle` - Toggle market open/closed
- `POST /api/admin/market/volatility` - Set market volatility

### Stock Endpoints
- `GET /api/stocks` - List all stocks
- `POST /api/stocks` - Create new stock
- `PUT /api/stocks/:id` - Update stock
- `DELETE /api/stocks/:id` - Delete stock

### User Endpoints
- `GET /api/users` - Get all users
- `DELETE /api/users/:id` - Remove user

### Transaction Endpoints
- `GET /api/transactions` - Get transaction history

## Socket.io Events

### Admin Events
- `marketToggle` - Toggle market state
- `setVolatility` - Set price volatility
- `updatePrices` - Force price update

### Broadcast Events
- `stockData` - Initial stock data on connection
- `stockUpdate` - Real-time stock price updates
- `marketState` - Market state updates

## Future Enhancements
- User role management
- Advanced charting with price history graphs
- Portfolio analytics by sector
- Transaction filtering and export
- Audit logs for admin actions
- Market simulation replay/recording
"# ATP-INDI" 
