import request from 'supertest';
import app from './app.js';
import { read, write } from './tools/json-files.js';

jest.mock('./tools/json-files.js');

const mockUsers = [
    { username: 'testuser', password: 'testpassword' }
];

const mockQuestions = [
    { id: '1', question: 'What is 2 + 2?', options: ['3', '4', '5'] }
];

describe('API Endpoints', () => {
    beforeAll(() => {
        read.mockImplementation(async (filePath) => {
            if (filePath === 'data/users.json') {
                return mockUsers;
            }
            if (filePath === 'data/questions.json') {
                return mockQuestions;
            }
            return [];
        });

        write.mockImplementation(async (filePath, data) => {
            if (filePath === 'data/users.json') {
                mockUsers.push(data);
            }
        });
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    it('should authenticate user and return a token', async () => {
        const res = await request(app)
            .post('/authenticate')
            .send({ username: 'testuser', password: 'testpassword' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
    });

    it('should fail to authenticate user with wrong password', async () => {
        const res = await request(app)
            .post('/authenticate')
            .send({ username: 'testuser', password: 'wrongpassword' });

        expect(res.statusCode).toEqual(401);
        expect(res.body).toHaveProperty('message', 'Invalid username or password');
    });

    it('should return a list of questions', async () => {
        const res = await request(app)
            .get('/questions')
            .set('Authorization', `Bearer ${jwt.sign({ username: 'testuser' }, '1234', { expiresIn: '1h' })}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockQuestions.map(({ id, question, options }) => ({ id, question, options })));
    });

    it('should return a specific question', async () => {
        const res = await request(app)
            .get('/questions/1')
            .set('Authorization', `Bearer ${jwt.sign({ username: 'testuser' }, '1234', { expiresIn: '1h' })}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockQuestions[0]);
    });

    it('should return 404 for a non-existent question', async () => {
        const res = await request(app)
            .get('/questions/999')
            .set('Authorization', `Bearer ${jwt.sign({ username: 'testuser' }, '1234', { expiresIn: '1h' })}`);

        expect(res.statusCode).toEqual(404);
        expect(res.body).toHaveProperty('message', 'Question not found');
    });

    it('should return game run results for authenticated user', async () => {
        const mockGameRuns = [
            { id: 'run1', userName: 'testuser', results: 'some results' }
        ];

        read.mockImplementationOnce(async (filePath) => {
            if (filePath === 'data/game-runs.json') {
                return mockGameRuns;
            }
            return [];
        });

        const res = await request(app)
            .get('/game-runs/run1/results')
            .set('Authorization', `Bearer ${jwt.sign({ username: 'testuser' }, '1234', { expiresIn: '1h' })}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual('some results');
    });

    it('should return 404 for a non-existent game run', async () => {
        const res = await request(app)
            .get('/game-runs/run999/results')
            .set('Authorization', `Bearer ${jwt.sign({ username: 'testuser' }, '1234', { expiresIn: '1h' })}`);

        expect(res.statusCode).toEqual(404);
        expect(res.body).toHaveProperty('message', 'Run not found or access denied');
    });
});
