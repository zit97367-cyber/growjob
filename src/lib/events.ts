import { EventType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logEvent(params: {
  eventType: EventType;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.eventLog.create({
    data: {
      eventType: params.eventType,
      userId: params.userId,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
