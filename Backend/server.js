require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('./config/passport');

const authRoutes = require('./routes/authRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');

const app = express();

// Global Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Jabarulin AI Backend is running' });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Jabarulin AI Backend is running' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Endpoint tidak ditemukan' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ status: 'error', message: 'Terjadi kesalahan internal pada server' });
});

// Koneksi ke MongoDB lalu jalankan server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Terhubung');
  })
  .catch((err) => {
    console.error('Gagal terhubung ke MongoDB (Abaikan peringatan ini untuk testing UI):', err.message);
    // process.exit(1); // Jangan exit agar server tetap menyala walau db mati
  })
  .finally(() => {
    // Jalankan server jika tidak dideploy sebagai serverless function (misal di Vercel)
    if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`Server berjalan di port ${PORT}`);
      });
    }
  });

module.exports = app;