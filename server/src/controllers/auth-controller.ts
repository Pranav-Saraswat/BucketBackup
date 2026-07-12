import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret-key-change-this';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, orgName } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create Organization first, then the user
    const organization = await prisma.organization.create({
      data: {
        name: orgName || `${name}'s Workspace`,
      },
    });

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'Admin', // First user in organization is Admin
        organizationId: organization.id,
      },
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Save registration event in audit log
    await prisma.auditEvent.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'user_register',
        details: `User ${email} registered and created workspace ${organization.name}.`,
      },
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  } catch (error: any) {
    console.error('Registration failed:', error);
    res.status(500).json({ error: 'Failed to register user.' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Save login event in audit log
    await prisma.auditEvent.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'user_login',
        details: `User ${email} successfully logged in.`,
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  } catch (error: any) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Failed to sign in.' });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json(dbUser);
  } catch (error: any) {
    console.error('Fetch profile failed:', error);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
};
