require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Import cors package
const userRoutes = require('./routes/userRoutes');

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => console.error(err));

