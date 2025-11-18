
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const clientRoutes = require('./routes/clientRoutes');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();
const cookieParser = require('cookie-parser');


const app = express();
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
//app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use('/api', clientRoutes);
app.use('/auth', authRoutes);

app.get('/health', (req, res) => res.json({ status: 'client ok' }));

const PORT = process.env.PORT || 6001;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () =>
    console.log(`Client service listening on ${PORT}`)
  );
}

module.exports = app;