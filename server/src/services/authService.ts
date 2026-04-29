import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';
import type { JwtPayload } from '../types.js';

function signToken(userId: Types.ObjectId, username: string): string {
  return jwt.sign({ sub: userId.toString(), username }, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export async function signup(username: string, password: string) {
  const normalized = username.trim().toLowerCase();
  const exists = await UserModel.findOne({ username: normalized }).lean();
  if (exists) throw new Error('USERNAME_EXISTS');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({ username: normalized, passwordHash });
  const token = signToken(user._id, user.username);

  return { token, user: { id: user._id.toString(), username: user.username } };
}

export async function login(username: string, password: string) {
  const normalized = username.trim().toLowerCase();
  const user = await UserModel.findOne({ username: normalized });
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error('INVALID_CREDENTIALS');

  const token = signToken(user._id, user.username);
  return { token, user: { id: user._id.toString(), username: user.username } };
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}

export async function getUserById(userId: string) {
  return UserModel.findById(userId).lean();
}
