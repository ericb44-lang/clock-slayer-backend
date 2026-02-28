# Clock Slayer - Time & Mileage Tracker

A Viking-themed time and mileage tracking application with automated weekly email reports.

## Features

- ⚔️ Viking woman slaying a clock logo with black & pink theme
- 📊 Project management with custom hourly and mileage rates
- ⏰ Clock in/out time tracking with live timer
- 🚗 Mileage logging per project
- 📝 Editable history for all entries
- 💰 Invoice generation for any date range
- 📧 **Automated weekly email reports every Friday at 8:44 PM**
- 📎 **CSV file attachment with detailed breakdown**

## Architecture

- **Frontend**: Single-page HTML/CSS/JavaScript app
- **Backend**: Node.js + Express + SQLite
- **Email**: Nodemailer with Gmail
- **Scheduling**: node-cron for automated Friday reports

## Setup Instructions

### 1. Prerequisites

- Node.js 16+ installed
- Gmail account for sending emails
- Server or hosting platform (Railway, Render, Heroku, or VPS)

### 2. Backend Setup

```bash
cd clock-slayer-backend

# Install dependencies
npm install

# Create .env file from template
cp .env.example .env
```

### 3. Configure Gmail App Password

**IMPORTANT**: You cannot use your regular Gmail password. You must create an App Password:

1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to **Security** > **2-Step Verification**
3. Scroll to the bottom and click **App passwords**
4. Select **Mail** as the app and **Other** as the device
5. Click **Generate**
6. Copy the 16-character password (no spaces)
7. Paste it into your `.env` file

### 4. Edit .env File

```env
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=abcd efgh ijkl mnop  # 16-character app password
PORT=3000
```

### 5. Test Locally

```bash
# Start the backend
npm start

# The server will run on http://localhost:3000
# You'll see: "Weekly email scheduled for Fridays at 8:44 PM Mountain Time"
```

### 6. Test Email Functionality

You can test the email without waiting for Friday:

```bash
# Using curl
curl -X POST http://localhost:3000/api/test-email

# Or visit in your browser and use the console:
fetch('http://localhost:3000/api/test-email', { method: 'POST' })
```

### 7. Configure Frontend

Open `clock-slayer.html` and update the API URL:

```javascript
// For local development
const API_URL = 'http://localhost:3000/api';

// For production (after deploying backend)
const API_URL = 'https://your-backend-url.com/api';
```

## Deployment Options

### Option 1: Railway (Recommended - Free Tier Available)

1. Create account at https://railway.app/
2. Click **New Project** > **Deploy from GitHub repo**
3. Select your repository or use **Deploy from local**
4. Add environment variables in Railway dashboard:
   - `EMAIL_USER`
   - `EMAIL_APP_PASSWORD`
5. Railway will auto-detect the Node.js app and deploy
6. Copy your Railway URL and update frontend `API_URL`

### Option 2: Render (Free Tier Available)

1. Create account at https://render.com/
2. Click **New** > **Web Service**
3. Connect your repository
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Add environment variables in Render dashboard
7. Copy your Render URL and update frontend `API_URL`

### Option 3: Heroku

```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create clock-slayer-backend

# Set environment variables
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_APP_PASSWORD=your-app-password

# Deploy
git push heroku main

# Copy your Heroku URL and update frontend API_URL
```

### Option 4: VPS (DigitalOcean, Linode, etc.)

```bash
# SSH into your server
ssh user@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Upload files or git clone your repository
git clone your-repo-url
cd clock-slayer-backend

# Install dependencies
npm install

# Install PM2 for process management
sudo npm install -g pm2

# Create .env file with your credentials
nano .env

# Start with PM2
pm2 start server.js --name clock-slayer
pm2 save
pm2 startup

# Setup nginx reverse proxy (optional)
sudo apt install nginx
# Configure nginx to proxy port 3000
```

## Email Report Format

Every Friday at 8:44 PM Mountain Time, you'll receive an email to **eblaser44@gmail.com** with:

**Subject**: Clock Slayer Weekly Report - MM/DD/YYYY - MM/DD/YYYY

**Body**:
- Summary with total entries, hours, and miles
- CSV file attachment

**CSV Columns**:
- Date
- Project
- Time In
- Time Out
- Total Time (hours)
- Mileage (miles)
- Project Notes

## Timezone Configuration

The default timezone is set to **America/Denver** (Mountain Time). To change:

Edit `server.js`:
```javascript
cron.schedule('44 20 * * 5', () => {
  sendWeeklyEmail();
}, {
  timezone: "America/New_York"  // Change to your timezone
});
```

**Common Timezones**:
- `America/New_York` (Eastern)
- `America/Chicago` (Central)
- `America/Denver` (Mountain)
- `America/Los_Angeles` (Pacific)

## Troubleshooting

### Emails not sending

1. **Check App Password**: Make sure you're using a Gmail App Password, not your regular password
2. **Enable 2-Factor Authentication**: Required for App Passwords
3. **Check logs**: Look for error messages in the backend console
4. **Test manually**: Use the `/api/test-email` endpoint

### "Failed to communicate with server"

1. **Backend not running**: Make sure the backend is started
2. **CORS issues**: Backend includes CORS middleware, but check browser console
3. **Wrong API_URL**: Make sure frontend points to correct backend URL
4. **Firewall**: Ensure port 3000 (or your PORT) is accessible

### Data not persisting

1. **Check database file**: `clockslayer.db` should exist in backend folder
2. **File permissions**: Ensure the backend can write to the directory
3. **Check API responses**: Open browser DevTools > Network tab

## Development

```bash
# Install nodemon for auto-restart during development
npm install -g nodemon

# Run in development mode
npm run dev
```

## Database

Data is stored in SQLite (`clockslayer.db`). To backup:

```bash
# Copy the database file
cp clockslayer.db clockslayer.backup.db

# Or use SQLite tools
sqlite3 clockslayer.db ".backup clockslayer.backup.db"
```

## CSV Format Example

```csv
Date,Project,Time In,Time Out,Total Time (hours),Mileage (miles),Project Notes
2025-02-21,Custom Home Build,08:00 AM,05:00 PM,9.00,45.50,Framing inspection and material delivery
2025-02-22,Remodel - Kitchen,09:00 AM,03:30 PM,6.50,12.30,Cabinet installation
```

## Security Notes

- Never commit your `.env` file to Git
- Use App Passwords, not regular Gmail passwords
- Consider using environment variables in production
- Restrict CORS in production if needed
- Use HTTPS for production deployments

## Support

For issues or questions, check:
1. Backend logs for error messages
2. Browser DevTools console for frontend errors
3. Gmail account for "Less secure app" blocks
4. Server timezone settings

## License

ISC
