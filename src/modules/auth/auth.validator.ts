import { z } from 'zod';

export const registerSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^a-zA-Z0-9]/),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    phone: z.string().optional(),
    role: z.enum(['ADMIN', 'AMBASSADOR', 'CHAMPION']).optional(),
  }).strict(),
};

export const loginSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }).strict(),
};

export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email(),
  }).strict(),
};

export const resetPasswordSchema = {
  body: z.object({
    email: z.string().email(),
    code: z.string().length(6),
    newPassword: z.string().min(8).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^a-zA-Z0-9]/),
  }).strict(),
};

export const verifyEmailSchema = {
  body: z.object({
    email: z.string().email(),
    code: z.string().length(6),
  }).strict(),
};

export const resendOtpSchema = {
  body: z.object({
    email: z.string().email(),
    type: z.enum(['EMAIL_VERIFICATION', 'PASSWORD_RESET']),
  }).strict(),
};

export const changePasswordSchema = {
  body: z.object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(8).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^a-zA-Z0-9]/),
  }).strict(),
};

export const refreshSessionSchema = {
  body: z.object({
    refreshToken: z.string().min(1),
  }).strict(),
};

export const oauthSchema = {
  body: z.object({
    idToken: z.string().min(1),
    provider: z.enum(['google', 'apple']),
  }).strict(),
};
