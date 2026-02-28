// server.js - Clock Slayer Backend
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { createObjectCsvStringifier } = require('csv-writer');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup (SQLite for simplicity, can switch to PostgreSQL for production)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './clockslayer.db',
  logging: false
});

// Models
const Project = sequelize.define('Project', {
  id: { type: DataTypes.BIGINT, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  hourlyRate: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  mileageRate: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.67 }
});

const TimeEntry = sequelize.define('TimeEntry', {
  id: { type: DataTypes.BIGINT, primaryKey: true },
  projectId: { type: DataTypes.BIGINT, allowNull: false },
  startTime: { type: DataTypes.DATE, allowNull: false },
  endTime: { type: DataTypes.DATE, allowNull: false },
  duration: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  notes: { type: DataTypes.TEXT }
});

const MileageEntry = sequelize.define('MileageEntry', {
  id: { type: DataTypes.BIGINT, primaryKey: true },
  projectId: { type: DataTypes.BIGINT, allowNull: false },
  miles: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  notes: { type: DataTypes.TEXT }
});

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_APP_PASSWORD // Gmail App Password (not regular password)
  }
});

// Generate CSV from time entries
async function generateWeeklyCSV() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // Get all time entries from the last 7 days
  const timeEntries = await TimeEntry.findAll({
    where: {
      startTime: {
        [Sequelize.Op.gte]: sevenDaysAgo
      }
    },
    order: [['startTime', 'ASC']]
  });

  // Get all mileage entries from the last 7 days
  const mileageEntries = await MileageEntry.findAll({
    where: {
      date: {
        [Sequelize.Op.gte]: sevenDaysAgo.toISOString().split('T')[0]
      }
    }
  });

  // Get all projects
  const projects = await Project.findAll();
  const projectMap = {};
  projects.forEach(p => projectMap[p.id] = p.name);

  // Create mileage lookup by project and date
  const mileageByProjectDate = {};
  mileageEntries.forEach(me => {
    const key = `${me.projectId}_${me.date}`;
    if (!mileageByProjectDate[key]) {
      mileageByProjectDate[key] = 0;
    }
    mileageByProjectDate[key] += parseFloat(me.miles);
  });

  // Format data for CSV
  const csvData = timeEntries.map(entry => {
    const startDate = new Date(entry.startTime);
    const endDate = new Date(entry.endTime);
    const dateStr = startDate.toISOString().split('T')[0];
    const mileageKey = `${entry.projectId}_${dateStr}`;
    
    return {
      date: dateStr,
      project: projectMap[entry.projectId] || 'Unknown',
      timeIn: startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      timeOut: endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      totalTime: parseFloat(entry.duration).toFixed(2),
      mileage: mileageByProjectDate[mileageKey] || '0.00',
      projectNotes: entry.notes || ''
    };
  });

  // Create CSV string
  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'date', title: 'Date' },
      { id: 'project', title: 'Project' },
      { id: 'timeIn', title: 'Time In' },
      { id: 'timeOut', title: 'Time Out' },
      { id: 'totalTime', title: 'Total Time (hours)' },
      { id: 'mileage', title: 'Mileage (miles)' },
      { id: 'projectNotes', title: 'Project Notes' }
    ]
  });

  const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(csvData);
  
  return {
    csvContent,
    entryCount: csvData.length,
    totalHours: csvData.reduce((sum, e) => sum + parseFloat(e.totalTime), 0).toFixed(2),
    totalMiles: csvData.reduce((sum, e) => sum + parseFloat(e.mileage), 0).toFixed(2)
  };
}

// Send weekly email
async function sendWeeklyEmail() {
  try {
    console.log('Generating weekly report...');
    const { csvContent, entryCount, totalHours, totalMiles } = await generateWeeklyCSV();
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    
    const dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    
    const emailBody = `
Clock Slayer Weekly Report
${dateRange}

Summary:
- Total Entries: ${entryCount}
- Total Hours: ${totalHours}
- Total Miles: ${totalMiles}

Please see the attached CSV file for detailed breakdown.

This is an automated report from Clock Slayer.
    `.trim();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'eblaser44@gmail.com',
      subject: `Clock Slayer Weekly Report - ${dateRange}`,
      text: emailBody,
      attachments: [
        {
          filename: `clock-slayer-${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.csv`,
          content: csvContent
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log('Weekly report sent successfully!');
  } catch (error) {
    console.error('Error sending weekly email:', error);
  }
}

// Schedule weekly email - Every Friday at 8:44 PM
// Cron format: minute hour day-of-month month day-of-week
// 44 20 * * 5 = 8:44 PM (20:44) every Friday (5)
cron.schedule('44 20 * * 5', () => {
  console.log('Running scheduled weekly email task...');
  sendWeeklyEmail();
}, {
  timezone: "America/Denver" // Mountain Time - adjust to your timezone
});

// API Routes

// Projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.findAll();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    await Project.update(req.body, { where: { id: req.params.id } });
    const project = await Project.findByPk(req.params.id);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    await Project.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Time Entries
app.get('/api/time-entries', async (req, res) => {
  try {
    const entries = await TimeEntry.findAll({ order: [['startTime', 'DESC']] });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/time-entries', async (req, res) => {
  try {
    const entry = await TimeEntry.create(req.body);
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/time-entries/:id', async (req, res) => {
  try {
    await TimeEntry.update(req.body, { where: { id: req.params.id } });
    const entry = await TimeEntry.findByPk(req.params.id);
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/time-entries/:id', async (req, res) => {
  try {
    await TimeEntry.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mileage Entries
app.get('/api/mileage-entries', async (req, res) => {
  try {
    const entries = await MileageEntry.findAll({ order: [['date', 'DESC']] });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/mileage-entries', async (req, res) => {
  try {
    const entry = await MileageEntry.create(req.body);
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/mileage-entries/:id', async (req, res) => {
  try {
    await MileageEntry.update(req.body, { where: { id: req.params.id } });
    const entry = await MileageEntry.findByPk(req.params.id);
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/mileage-entries/:id', async (req, res) => {
  try {
    await MileageEntry.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test email endpoint (for testing without waiting for Friday)
app.post('/api/test-email', async (req, res) => {
  try {
    await sendWeeklyEmail();
    res.json({ success: true, message: 'Test email sent!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and start server
async function startServer() {
  try {
    await sequelize.sync();
    console.log('Database synchronized');
    
    app.listen(PORT, () => {
      console.log(`Clock Slayer Backend running on port ${PORT}`);
      console.log(`Weekly email scheduled for Fridays at 8:44 PM Mountain Time`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();
