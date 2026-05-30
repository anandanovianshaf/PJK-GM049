require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', apiRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'Backend Service is running', port: PORT });
});

// Start Server
app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 Backend Service berjalan di http://localhost:${PORT}`);
    console.log(`=================================`);
});
