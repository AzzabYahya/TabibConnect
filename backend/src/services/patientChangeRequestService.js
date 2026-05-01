const prisma = require('../config/prisma');
const HttpError = require('../utils/httpError');

const getPatientContext = async (userId) => {
  const patient = await prisma.patient.findUnique({
    where: { userId },
    select: { id: true, userId: true },
  });
  if (!patient) {
    throw new HttpError(404, 'Patient profile not found');
  }
  return patient;
};

const submitPatientChangeRequest = async ({ userId, payload }) => {
  const patient = await getPatientContext(userId);
  const reason = String(payload.reason || '').trim();
  if (!reason) {
    throw new HttpError(400, 'Reason is required');
  }
  const data = payload.data || {};

  return prisma.patientChangeRequest.create({
    data: {
      patientId: patient.id,
      reason,
      payload: {
        adresse: data.adresse ?? undefined,
        ville: data.ville ?? undefined,
        groupeSanguin: data.groupeSanguin ?? undefined,
        antecedents: data.antecedents ?? undefined,
      },
    },
  });
};

const listMyPatientChangeRequests = async ({ userId }) => {
  const patient = await getPatientContext(userId);
  return prisma.patientChangeRequest.findMany({
    where: { patientId: patient.id },
    orderBy: [{ createdAt: 'desc' }],
    take: 50,
  });
};

const listPendingPatientChangeRequests = async ({ page = 1, limit = 20 }) => {
  const currentPage = Math.max(1, Number(page));
  const pageSize = Math.min(50, Math.max(1, Number(limit)));

  const [items, total] = await Promise.all([
    prisma.patientChangeRequest.findMany({
      where: { status: 'PENDING' },
      include: { patient: { include: { user: { select: { email: true } } } } },
      orderBy: [{ createdAt: 'asc' }],
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.patientChangeRequest.count({ where: { status: 'PENDING' } }),
  ]);

  return {
    items: items.map((r) => ({
      id: r.id,
      patientId: r.patientId,
      patientEmail: r.patient?.user?.email || null,
      reason: r.reason,
      payload: r.payload,
      createdAt: r.createdAt,
      status: r.status,
    })),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasNextPage: currentPage * pageSize < total,
      hasPrevPage: currentPage > 1,
    },
  };
};

const approvePatientChangeRequest = async ({ requestId, adminUserId, reviewNote }) => {
  const request = await prisma.patientChangeRequest.findUnique({
    where: { id: requestId },
    include: { patient: true },
  });
  if (!request) {
    throw new HttpError(404, 'Patient change request not found');
  }
  if (request.status !== 'PENDING') {
    throw new HttpError(400, 'Request already reviewed');
  }

  const data = request.payload || {};
  await prisma.patient.update({
    where: { id: request.patientId },
    data: {
      adresse: data.adresse ?? undefined,
      ville: data.ville ?? undefined,
      groupeSanguin: data.groupeSanguin ?? undefined,
      antecedents: data.antecedents ?? undefined,
    },
  });

  return prisma.patientChangeRequest.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      reviewNote: reviewNote || null,
      reviewedByUserId: adminUserId,
      reviewedAt: new Date(),
    },
  });
};

const rejectPatientChangeRequest = async ({ requestId, adminUserId, reviewNote }) => {
  const request = await prisma.patientChangeRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true },
  });
  if (!request) {
    throw new HttpError(404, 'Patient change request not found');
  }
  if (request.status !== 'PENDING') {
    throw new HttpError(400, 'Request already reviewed');
  }
  return prisma.patientChangeRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      reviewNote: reviewNote || null,
      reviewedByUserId: adminUserId,
      reviewedAt: new Date(),
    },
  });
};

module.exports = {
  submitPatientChangeRequest,
  listMyPatientChangeRequests,
  listPendingPatientChangeRequests,
  approvePatientChangeRequest,
  rejectPatientChangeRequest,
};

