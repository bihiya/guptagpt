import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { login, loginWithGoogle, signup } from '../services/authService.js';
import type { AuthRequestBody, GoogleAuthRequestBody } from '../types.js';

const router = Router();

function valid(body: Partial<AuthRequestBody>): body is AuthRequestBody {
  return Boolean(body.email?.trim()) && typeof body.password === 'string' && body.password.length >= 6;
}

router.post('/signup', async (req, res, next) => {
  try {
    const body = req.body as Partial<AuthRequestBody>;
    if (!valid(body)) {
      res.status(400).json({ error: 'Email and password (min 6 chars) are required' });
      return;
    }

    const result = await signup(body.email, body.password);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'USERNAME_EXISTS') {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }
    if (error instanceof Error && error.message === 'INVALID_EMAIL') {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const body = req.body as Partial<AuthRequestBody>;
    if (!valid(body)) {
      res.status(400).json({ error: 'Email and password (min 6 chars) are required' });
      return;
    }

    const result = await login(body.email, body.password);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    if (error instanceof Error && error.message === 'PASSWORD_LOGIN_DISABLED') {
      res.status(400).json({ error: 'This account uses Google sign-in. Continue with Google.' });
      return;
    }
    if (error instanceof Error && error.message === 'INVALID_EMAIL') {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }
    next(error);
  }
});

router.post('/google', async (req, res, next) => {
  try {
    const body = req.body as Partial<GoogleAuthRequestBody>;
    if (!body.idToken?.trim()) {
      res.status(400).json({ error: 'Google idToken is required' });
      return;
    }

    const result = await loginWithGoogle(body.idToken);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'GOOGLE_AUTH_NOT_CONFIGURED') {
      res.status(503).json({ error: 'Google auth is not configured on server' });
      return;
    }
    if (error instanceof Error && error.message === 'INVALID_GOOGLE_TOKEN') {
      res.status(401).json({ error: 'Invalid Google token' });
      return;
    }
    next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.authUser });
});

export default router;
