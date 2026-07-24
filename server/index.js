require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.options('*', cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


app.use('/players',      require('./routes/players')(pool));
app.use('/roles',        require('./routes/roles')(pool));
app.use('/games',        require('./routes/games')(pool));
app.use('/participants', require('./routes/participants')(pool));
app.use('/votes',        require('./routes/votes')(pool));
app.use('/executions',   require('./routes/executions')(pool));
app.use('/night-kills',  require('./routes/nightKills')(pool));
app.use('/co-events',      require('./routes/coEvents')(pool));
app.use('/seer-results',   require('./routes/seerResults')(pool));
app.use('/medium-results', require('./routes/mediumResults')(pool));
app.use('/knight-guards',  require('./routes/knightGuards')(pool));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
