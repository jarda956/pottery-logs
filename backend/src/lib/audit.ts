import { prisma } from "./prisma";

export async function logAudit(
  actorId: string | null,
  action: string,
  targetId?: string,
  details?: string
): Promise<void> {
  await prisma.auditLog.create({
    data: { actorId, action, targetId, details },
  });
}
