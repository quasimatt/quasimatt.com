// server.js
const express = require('express');
const { createPool } = require('@vercel/postgres');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Create a pool of connections to the Vercel Postgres database
const pool = createPool({
  connectionString: process.env.POSTGRES_URL
});

// Initialize the database
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS responses (
        id SERIAL PRIMARY KEY,
        question_id INTEGER REFERENCES questions(id),
        text TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } finally {
    client.release();
  }
}

initializeDatabase().catch(console.error);

// API Routes
app.get('/api/questions', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM questions ORDER BY timestamp DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/questions', async (req, res) => {
  const { text } = req.body;
  const client = await pool.connect();
  try {
    const result = await client.query(
      'INSERT INTO questions (text) VALUES ($1) RETURNING *',
      [text]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/questions/:id/responses', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM responses WHERE question_id = $1 ORDER BY timestamp ASC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/questions/:id/responses', async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const client = await pool.connect();
  try {
    const result = await client.query(
      'INSERT INTO responses (question_id, text) VALUES ($1, $2) RETURNING *',
      [id, text]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
