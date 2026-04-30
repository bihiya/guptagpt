import type { NextFunction, Request, Response } from 'express';
import { getUserById, verifyToken } from '../services/authService.js';

declare global {
  namespace Express {
    interface Request {
      authUser?: { id: string; username: string; email: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing bearer token' });
      return;
    }

    const token = header.slice('Bearer '.length).trim();
    const payload = verifyToken(token);
    const user = await getUserById(payload.sub);

    if (!user) {
      res.status(401).json({ error: 'Invalid token user' });
      return;
    }

    req.authUser = { id: user._id.toString(), username: user.username ?? user.email, email: user.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
