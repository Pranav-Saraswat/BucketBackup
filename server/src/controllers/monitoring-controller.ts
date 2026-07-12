import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getAuditEvents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // In a multi-tenant setup, we can filter by userId or organization users
    // Let's filter events belonging to users within the same organization
    const orgUsers = await prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true }
    });
    const userIds = orgUsers.map(u => u.id);

    const events = await prisma.auditEvent.findMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { userId: null } // System-level audits
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(events);
  } catch (error: any) {
    console.error('Failed to retrieve audit logs:', error);
    res.status(500).json({ error: 'Failed to retrieve audit events.' });
  }
};

export const getAlerts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const alerts = await prisma.alert.findMany({
      where: {
        job: { organizationId: user.organizationId }
      },
      include: {
        job: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(alerts);
  } catch (error: any) {
    console.error('Failed to retrieve alerts:', error);
    res.status(500).json({ error: 'Failed to retrieve active alerts.' });
  }
};

export const resolveAlert = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const id = req.params.id as string;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Validate ownership
    const alert = await prisma.alert.findFirst({
      where: {
        id,
        job: { organizationId: user.organizationId }
      }
    });

    if (!alert) return res.status(404).json({ error: 'Alert not found.' });

    await prisma.alert.update({
      where: { id },
      data: { resolved: true }
    });

    // Log the resolution action
    await prisma.auditEvent.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'resolve_alert',
        details: `Resolved alert: ${alert.message}`,
      },
    });

    res.json({ message: 'Alert resolved successfully.' });
  } catch (error: any) {
    console.error('Failed to resolve alert:', error);
    res.status(500).json({ error: 'Failed to update alert.' });
  }
};
