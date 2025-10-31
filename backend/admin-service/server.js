
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const adminRoutes = require('./routes/adminRoutes');
const { initDb } = require('./setup');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize DB (creates database.sqlite and tables if missing)
initDb();

app.use('/api/admin', adminRoutes);

// Basic health
app.get('/health', (req, res) => res.json({ status: 'admin ok' }));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Admin service listening on ${PORT}`));
