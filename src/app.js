import express from 'express';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import { read, write } from './tools/json-files.js';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(bodyParser.json());

const SECRET_KEY = '1234';

// Middleware to verify JWT tokens
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ message: 'Missing authorization token.' });
    }
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid authorization token.' });
    }
}

app.post('/authenticate', async (req, res) => {
    const { username, password } = req.body;
    const users = await read('data/users.json');

    const user = users.find(user => user.username === username && user.password === password);
    if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
});

app.get('/questions', async (req, res) => {
    const questions = await read('data/questions.json');
    const questionsList = questions.map(({ id, question, options }) => ({ id, question, options }));
    res.json(questionsList);
});

app.get('/questions/:questionId', async (req, res) => {
    const { questionId } = req.params;
    const questions = await read('data/questions.json');
    const question = questions.find(q => q.id === questionId);

    if (!question) {
        return res.status(404).json({ message: 'Question not found' });
    }

    res.json(question);
});

app.get('/game-runs/:runId/results', verifyToken, async (req, res) => {
    const { runId } = req.params;
    const { username } = req.user;

    const gameRuns = await read('data/game-runs.json');
    const run = gameRuns.find(run => run.id === runId && run.userName === username);

    if (!run) {
        return res.status(404).json({ message: 'Run not found or access denied' });
    }

    res.json(run.results);
});

export default app;
