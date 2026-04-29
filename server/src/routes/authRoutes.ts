import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { login, signup } from '../services/authService.js';
import type { AuthRequestBody } from '../types.js';

const router = Router();

function valid(body: Partial<AuthRequestBody>): body is AuthRequestBody {
  return Boolean(body.username?.trim()) && Boolean(body.password) && body.password.length >= 6;
}

router.post('/signup', async (req, res, next) => {
  try {
    const body = req.body as Partial<AuthRequestBody>;
    if (!valid(body)) {
      res.status(400).json({ error: 'Username and password (min 6 chars) are required' });
      return;
    }

    const result = await signup(body.username, body.password);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'USERNAME_EXISTS') {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const body = req.body as Partial<AuthRequestBody>;
    if (!valid(body)) {
      res.status(400).json({ error: 'Username and password (min 6 chars) are required' });
      return;
    }

    const result = await login(body.username, body.password);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.authUser });
});

export default router;
