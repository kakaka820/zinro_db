import 'dotenv/config';
 import express from 'express';
 import { createDbPool } from './db';
 import cors from 'cors';
 import playersRouter from './routes/players';
 import rolesRouter from './routes/roles';
 import gamesRouter from './routes/games';
 import participantsRouter from './routes/participants';
 import votesRouter from './routes/votes';
 import executionsRouter from './routes/executions';
 import nightKillsRouter from './routes/nightKills';
 import coEventsRouter from './routes/coEvents';
 import seerResultsRouter from './routes/seerResults';
 import mediumResultsRouter from './routes/mediumResults';
 import knightGuardsRouter from './routes/knightGuards';

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.options('*', cors());
app.use(express.json());

const pool = createDbPool();

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


app.use('/players', playersRouter(pool));
 app.use('/roles', rolesRouter(pool));
 app.use('/games', gamesRouter(pool));
 app.use('/participants', participantsRouter(pool));
 app.use('/votes', votesRouter(pool));
 app.use('/executions', executionsRouter(pool));
 app.use('/night-kills', nightKillsRouter(pool));
 app.use('/co-events', coEventsRouter(pool));
 app.use('/seer-results', seerResultsRouter(pool));
 app.use('/medium-results', mediumResultsRouter(pool));
 app.use('/knight-guards', knightGuardsRouter(pool));

const PORT = process.env.PORT || 3000;
app.listen(Number(PORT), () => {
   console.log(`Server running on port ${PORT}`);
 });
