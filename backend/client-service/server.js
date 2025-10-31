
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const clientRoutes = require('./routes/clientRoutes');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api', clientRoutes);

app.get('/health', (req, res) => res.json({ status: 'client ok' }));

const PORT = process.env.PORT || 6001;
app.listen(PORT, () => console.log(`Client service listening on ${PORT}`));
