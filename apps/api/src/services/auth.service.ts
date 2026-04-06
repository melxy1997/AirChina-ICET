import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/error.middleware.js';
import type { ID } from '@icet/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 10;

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthResult {
  user: { id: string; name: string; email: string; role: string; organizationId: string };
  token: string;
}

/** 注册 */
export async function register(data: {
  name: string;
  email: string;
  password: string;
  organizationId: string;
  role?: string;
}): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError(409, '该邮箱已注册');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      organizationId: data.organizationId,
      role: (data.role as any) || 'TESTER',
      isActive: true,
    },
  });

  const token = signToken({ userId: user.id, email: user.email, role: user.role });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    },
    token,
  };
}

/** 登录 */
export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, '邮箱或密码错误');
  }
  if (!user.isActive) {
    throw new AppError(403, '账号已被禁用');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, '邮箱或密码错误');
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    },
    token,
  };
}

/** 获取当前用户信息 */
export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, organizationId: true, isActive: true },
  });
  if (!user) {
    throw new AppError(404, '用户不存在');
  }
  return user;
}

/** 验证 JWT token，返回 payload 或抛错 */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    throw new AppError(401, '登录已过期，请重新登录');
  }
}

function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
