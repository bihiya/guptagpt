import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    username: { type: String, unique: true, lowercase: true, trim: true, sparse: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String }
  },
  { timestamps: true }
);

export const UserModel = model('User', userSchema);
