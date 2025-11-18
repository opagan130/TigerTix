const express = require('express');
const cors = require('cors');
const app = express();
const routes = require('./routes/routes');
app.use(cors());
app.use('/api', routes);
const PORT = 5000;
if (process.env.NODE_ENV !== "test"){ 
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`)); 

}

module.exports = app; 