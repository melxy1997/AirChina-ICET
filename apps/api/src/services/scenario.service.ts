import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/error.middleware.js';

export async function listScenarios(orgId: string, page = 1, pageSize = 20) {
  const where = { organizationId: orgId, isActive: true };
  const [data, total] = await Promise.all([
    prisma.businessScenario.findMany({
      where,
      include: { _count: { select: { regulations: true, tasks: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.businessScenario.count({ where }),
  ]);
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getScenario(id: string, orgId: string) {
  const scenario = await prisma.businessScenario.findFirst({
    where: { id, organizationId: orgId },
    include: {
      regulations: {
        select: { id: true, title: true, version: true, parseStatus: true },
      },
      _count: { select: { tasks: true } },
    },
  });
  if (!scenario) throw new AppError(404, '业务场景不存在');
  return scenario;
}

export async function createScenario(data: {
  organizationId: string;
  processLevel1: string;
  processLevel2: string;
  processLevel3?: string;
  name: string;
  description?: string;
  createdBy: string;
}) {
  return prisma.businessScenario.create({ data });
}

export async function updateScenario(
  id: string,
  orgId: string,
  data: {
    processLevel1?: string;
    processLevel2?: string;
    processLevel3?: string;
    name?: string;
    description?: string;
    isActive?: boolean;
  },
) {
  const scenario = await prisma.businessScenario.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!scenario) throw new AppError(404, '业务场景不存在');
  return prisma.businessScenario.update({ where: { id }, data });
}

export async function deleteScenario(id: string, orgId: string) {
  const scenario = await prisma.businessScenario.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!scenario) throw new AppError(404, '业务场景不存在');
  return prisma.businessScenario.update({ where: { id }, data: { isActive: false } });
}

export async function linkRegulation(scenarioId: string, regulationId: string) {
  return prisma.scenarioRegulation.create({
    data: { scenarioId, regulationId },
  });
}

export async function unlinkRegulation(scenarioId: string, regulationId: string) {
  return prisma.scenarioRegulation.delete({
    where: { scenarioId_regulationId: { scenarioId, regulationId } },
  });
}
