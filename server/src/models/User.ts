import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

userSchema.index({ username: 1 }, { unique: true });

export const UserModel = model('User', userSchema);
