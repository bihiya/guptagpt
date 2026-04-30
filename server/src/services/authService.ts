import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';
import type { JwtPayload } from '../types.js';

const googleClient = new OAuth2Client();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertValidEmail(email: string): void {
  if (!emailRegex.test(email)) {
    throw new Error('INVALID_EMAIL');
  }
}

function usernameFromEmail(email: string): string {
  return email.split('@')[0] ?? 'user';
}

function signToken(userId: Types.ObjectId, email: string): string {
  return jwt.sign({ sub: userId.toString(), email }, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export async function signup(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  assertValidEmail(normalizedEmail);
  const exists = await UserModel.findOne({ email: normalizedEmail }).lean();
  if (exists) throw new Error('USERNAME_EXISTS');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({
    username: usernameFromEmail(normalizedEmail),
    email: normalizedEmail,
    passwordHash
  });
  const token = signToken(user._id, user.email);

  return { token, user: { id: user._id.toString(), username: user.username ?? user.email, email: user.email } };
}

export async function login(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  assertValidEmail(normalizedEmail);
  const user = await UserModel.findOne({ email: normalizedEmail });
  if (!user) throw new Error('INVALID_CREDENTIALS');
  if (!user.passwordHash) throw new Error('PASSWORD_LOGIN_DISABLED');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error('INVALID_CREDENTIALS');

  const token = signToken(user._id, user.email);
  return { token, user: { id: user._id.toString(), username: user.username ?? user.email, email: user.email } };
}

export async function loginWithGoogle(idToken: string) {
  if (!env.googleClientId) {
    throw new Error('GOOGLE_AUTH_NOT_CONFIGURED');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.googleClientId
  });

  const payload = ticket.getPayload();
  const email = normalizeEmail(payload?.email ?? '');
  const emailVerified = payload?.email_verified === true;

  if (!email || !emailVerified) {
    throw new Error('INVALID_GOOGLE_TOKEN');
  }

  let user = await UserModel.findOne({ email });
  if (!user) {
    user = await UserModel.create({
      email,
      username: usernameFromEmail(email)
    });
  }

  const token = signToken(user._id, user.email);
  return { token, user: { id: user._id.toString(), username: user.username ?? user.email, email: user.email } };
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}

export async function getUserById(userId: string) {
  return UserModel.findById(userId).lean();
}
