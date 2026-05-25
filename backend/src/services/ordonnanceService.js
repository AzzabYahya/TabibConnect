const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const prisma = require('../config/prisma');
const HttpError = require('../utils/httpError');
const { sendMail } = require('./emailService');
const { createNotification } = require('./notificationService');

const mkdir = promisify(fs.mkdir);
const ORDONNANCES_DIR = path.resolve(process.cwd(), 'uploads', 'ordonnances');

const ensureDir = async (dirPath) => {
  await mkdir(dirPath, { recursive: true });
};

const getDoctorContext = async (userId) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true, nomComplet: true, specialite: true, inpe: true },
  });

  if (!doctor) throw new HttpError(404, 'Doctor profile not found');
  return doctor;
};

const getAppointmentForOrdonnance = async (appointmentId, doctorId) => {
  const appointment = await prisma.rendezVous.findUnique({
    where: { id: appointmentId },
    include: {
      ordonnance: true,
      patient: {
        include: {
          user: { select: { email: true } },
        },
      },
      doctor: {
        include: {
          user: { select: { email: true } },
        },
      },
    },
  });

  if (!appointment) throw new HttpError(404, 'Appointment not found');

  if (appointment.doctorId !== doctorId) {
    throw new HttpError(403, 'You can only create ordonnances for your own appointments');
  }

  return appointment;
};

/**
 * Generate a simple text-based PDF using pdfkit if available.
 * Falls back to a plain text file if pdfkit is not installed.
 */
const generateOrdonnancePdf = async ({
  ordonnanceId,
  doctor,
  patient,
  medicaments,
  instructions,
  renouvelable,
  qrCode,
  dateEmission,
}) => {
  await ensureDir(ORDONNANCES_DIR);

  const fileName = `ordonnance-${ordonnanceId}.pdf`;
  const filePath = path.join(ORDONNANCES_DIR, fileName);

  let pdfkit;
  try {
    pdfkit = require('pdfkit');
  } catch {
    // pdfkit not available: write a plain text stub
    const lines = [
      '=== ORDONNANCE MÉDICALE — TabibConnect ===',
      '',
      `Médecin : ${doctor.nomComplet || 'N/A'}  |  INPE : ${doctor.inpe || 'N/A'}`,
      `Spécialité : ${doctor.specialite || 'N/A'}`,
      '',
      `Patient : ${patient.nom || patient.email || 'N/A'}`,
      `Date d'émission : ${new Date(dateEmission).toLocaleDateString('fr-FR')}`,
      '',
      '--- Médicaments ---',
      ...(Array.isArray(medicaments)
        ? medicaments.map((m, i) => `${i + 1}. ${m.medicament || m.nom || JSON.stringify(m)} — ${m.posologie || ''}`)
        : ['(aucun médicament renseigné)']),
      '',
      instructions ? `Instructions : ${instructions}` : '',
      renouvelable ? 'Renouvellement : AUTORISÉ' : 'Renouvellement : NON AUTORISÉ',
      '',
      `QR Code de vérification : ${qrCode}`,
      '',
      'Document généré par TabibConnect — tabibconnect.ma',
    ];

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    return { filePath, fileName };
  }

  await new Promise((resolve, reject) => {
    try {
      const doc = new pdfkit({ margin: 50 });
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // Header
      doc
        .fontSize(18)
        .fillColor('#1A6B8A')
        .text('ORDONNANCE MÉDICALE', { align: 'center' })
        .moveDown(0.3)
        .fontSize(10)
        .fillColor('#475569')
        .text('TabibConnect — tabibconnect.ma', { align: 'center' })
        .moveDown(1);

      // Separator
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E2E8F0').stroke().moveDown(0.5);

      // Médecin
      doc
        .fontSize(11)
        .fillColor('#0F172A')
        .text(`Médecin : ${doctor.nomComplet || 'N/A'}`, { continued: true })
        .text(`   INPE : ${doctor.inpe || 'N/A'}`, { align: 'right' })
        .text(`Spécialité : ${doctor.specialite || 'N/A'}`)
        .moveDown(0.5);

      // Patient
      doc
        .text(`Patient : ${patient.nom || patient.email || 'N/A'}`)
        .text(`Date d'émission : ${new Date(dateEmission).toLocaleDateString('fr-FR')}`)
        .moveDown(1);

      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E2E8F0').stroke().moveDown(0.5);

      // Médicaments
      doc.fontSize(12).fillColor('#1A6B8A').text('Médicaments prescrits').moveDown(0.5);

      doc.fontSize(11).fillColor('#0F172A');
      if (Array.isArray(medicaments) && medicaments.length > 0) {
        medicaments.forEach((m, i) => {
          const name = m.medicament || m.nom || `Médicament ${i + 1}`;
          const posologie = m.posologie || '';
          doc.text(`${i + 1}. ${name}${posologie ? ` — ${posologie}` : ''}`);
        });
      } else {
        doc.text('(Aucun médicament renseigné)');
      }

      doc.moveDown(0.8);

      if (instructions) {
        doc
          .fontSize(12)
          .fillColor('#1A6B8A')
          .text('Instructions générales')
          .moveDown(0.3)
          .fontSize(11)
          .fillColor('#0F172A')
          .text(instructions)
          .moveDown(0.8);
      }

      doc
        .fontSize(10)
        .fillColor('#64748B')
        .text(renouvelable ? '✓ Renouvellement autorisé' : '✗ Renouvellement non autorisé')
        .moveDown(1.5);

      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E2E8F0').stroke().moveDown(0.5);

      // QR code mention
      doc
        .fontSize(9)
        .fillColor('#94A3B8')
        .text(`Code de vérification : ${qrCode}`, { align: 'left' })
        .moveDown(0.3)
        .text('Ce document a été généré par TabibConnect. Vérifiez l\'authenticité via l\'application.', {
          align: 'left',
        });

      doc.end();

      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });

  return { filePath, fileName };
};

const sendOrdonnanceEmail = async ({ patientEmail, doctorName, pdfPath, ordonnanceId }) => {
  if (!patientEmail) return;

  const attachments = [];

  if (pdfPath && fs.existsSync(pdfPath)) {
    attachments.push({
      filename: `ordonnance-${ordonnanceId}.pdf`,
      path: pdfPath,
      contentType: 'application/pdf',
    });
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
      <div style="background: #1A6B8A; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">TabibConnect</h1>
        <p style="color: #B2D8E8; margin: 4px 0 0; font-size: 13px;">Ordonnance médicale disponible</p>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #E2E8F0;">
        <p style="color: #0F172A; font-size: 15px;">Bonjour,</p>
        <p style="color: #475569;">Votre médecin <strong>${doctorName || 'TabibConnect'}</strong> a émis une ordonnance pour votre consultation.</p>
        <p style="color: #475569;">Vous trouverez votre ordonnance en pièce jointe (PDF). Présentez-la à votre pharmacien ou scannez le QR code pour en vérifier l'authenticité.</p>
        <div style="background: #F0FDF4; border: 1px solid #86EFAC; padding: 12px; border-radius: 8px; margin: 16px 0;">
          <p style="color: #166534; font-size: 13px; margin: 0;">
            ✅ Cette ordonnance est authentique et vérifiable via TabibConnect.
          </p>
        </div>
        <p style="color: #94A3B8; font-size: 12px; margin-top: 20px;">TabibConnect — Votre santé, notre priorité.</p>
      </div>
    </div>
  `;

  try {
    await sendMail({
      to: patientEmail,
      subject: 'TabibConnect — Votre ordonnance médicale',
      html,
      attachments,
    });
  } catch (error) {
    console.error('Failed to send ordonnance email:', error?.message || error);
  }
};

const createOrdonnance = async ({ appointmentId, userId, payload }) => {
  const doctor = await getDoctorContext(userId);
  const appointment = await getAppointmentForOrdonnance(appointmentId, doctor.id);

  if (appointment.ordonnance) {
    throw new HttpError(409, 'Une ordonnance existe déjà pour ce rendez-vous');
  }

  const { medicaments = [], instructions = '', renouvelable = false } = payload;

  if (!Array.isArray(medicaments) || medicaments.length === 0) {
    throw new HttpError(400, 'Au moins un médicament est requis');
  }

  const qrCode = crypto.randomUUID();

  const ordonnance = await prisma.ordonnance.create({
    data: {
      rendezVousId: appointmentId,
      doctorId: doctor.id,
      patientId: appointment.patientId,
      medicaments: JSON.parse(JSON.stringify(medicaments)),
      instructions: instructions ? String(instructions).trim() : null,
      renouvelable: Boolean(renouvelable),
      qrCode,
    },
  });

  // Generate PDF
  let pdfPath = null;
  let pdfUrl = null;

  try {
    const { filePath, fileName } = await generateOrdonnancePdf({
      ordonnanceId: ordonnance.id,
      doctor: {
        nomComplet: doctor.nomComplet,
        specialite: doctor.specialite,
        inpe: doctor.inpe,
      },
      patient: {
        nom: null,
        email: appointment.patient?.user?.email,
      },
      medicaments,
      instructions,
      renouvelable,
      qrCode,
      dateEmission: ordonnance.createdAt,
    });

    pdfPath = filePath;
    pdfUrl = `/uploads/ordonnances/${fileName}`;

    await prisma.ordonnance.update({
      where: { id: ordonnance.id },
      data: { pdfPath: filePath },
    });
  } catch (pdfError) {
    console.error('PDF generation error:', pdfError?.message || pdfError);
  }

  // Send email to patient
  const patientEmail = appointment.patient?.user?.email;
  await sendOrdonnanceEmail({
    patientEmail,
    doctorName: doctor.nomComplet,
    pdfPath,
    ordonnanceId: ordonnance.id,
  });

  // Notify patient
  if (appointment.patient?.userId) {
    await createNotification({
      userId: appointment.patient.userId,
      type: 'SYSTEME',
      message: `Dr. ${doctor.nomComplet || 'Votre médecin'} a émis une ordonnance pour votre consultation. Vérifiez votre email.`,
      metadata: {
        appointmentId,
        category: 'ORDONNANCE',
        event: 'CREATED',
        ordonnanceId: ordonnance.id,
      },
    });
  }

  return {
    ordonnanceId: ordonnance.id,
    qrCode: ordonnance.qrCode,
    pdfUrl,
    createdAt: ordonnance.createdAt.toISOString(),
  };
};

const uploadOrdonnance = async ({ appointmentId, userId, file }) => {
  const doctor = await getDoctorContext(userId);
  const appointment = await getAppointmentForOrdonnance(appointmentId, doctor.id);

  if (!file) throw new HttpError(400, 'Aucun fichier fourni');

  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new HttpError(400, 'Seuls PDF, JPG et PNG sont acceptés');
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new HttpError(400, 'Le fichier ne doit pas dépasser 5 Mo');
  }

  await ensureDir(ORDONNANCES_DIR);

  const ext = path.extname(file.originalname || file.filename || '').toLowerCase() || '.pdf';
  const fileName = `upload-${appointmentId}-${Date.now()}${ext}`;
  const filePath = path.join(ORDONNANCES_DIR, fileName);

  // If multer has already saved to disk, rename it; otherwise write buffer
  if (file.path) {
    fs.renameSync(file.path, filePath);
  } else if (file.buffer) {
    fs.writeFileSync(filePath, file.buffer);
  }

  const qrCode = crypto.randomUUID();

  let ordonnance;
  if (appointment.ordonnance) {
    ordonnance = await prisma.ordonnance.update({
      where: { id: appointment.ordonnance.id },
      data: { uploadedFile: fileName, pdfPath: filePath },
    });
  } else {
    ordonnance = await prisma.ordonnance.create({
      data: {
        rendezVousId: appointmentId,
        doctorId: doctor.id,
        patientId: appointment.patientId,
        medicaments: [],
        qrCode,
        uploadedFile: fileName,
        pdfPath: filePath,
      },
    });
  }

  // Notify patient
  const patientEmail = appointment.patient?.user?.email;
  if (appointment.patient?.userId) {
    await createNotification({
      userId: appointment.patient.userId,
      type: 'SYSTEME',
      message: 'Votre médecin vous a envoyé une ordonnance. Consultez vos rendez-vous pour la télécharger.',
      metadata: {
        appointmentId,
        category: 'ORDONNANCE',
        event: 'UPLOADED',
        ordonnanceId: ordonnance.id,
      },
    });
  }

  await sendOrdonnanceEmail({
    patientEmail,
    doctorName: doctor.nomComplet,
    pdfPath: filePath,
    ordonnanceId: ordonnance.id,
  });

  return {
    ordonnanceId: ordonnance.id,
    qrCode: ordonnance.qrCode,
    fileUrl: `/uploads/ordonnances/${fileName}`,
  };
};

const verifyOrdonnance = async ({ qrCode }) => {
  const ordonnance = await prisma.ordonnance.findUnique({
    where: { qrCode },
    include: {
      doctor: { select: { nomComplet: true, specialite: true, inpe: true } },
      patient: {
        include: {
          user: { select: { email: true } },
        },
      },
    },
  });

  if (!ordonnance) {
    return { valide: false };
  }

  return {
    valide: true,
    medecin: {
      nom: ordonnance.doctor.nomComplet,
      specialite: ordonnance.doctor.specialite,
      inpe: ordonnance.doctor.inpe,
    },
    patient: {
      email: ordonnance.patient?.user?.email,
    },
    medicaments: ordonnance.medicaments,
    instructions: ordonnance.instructions,
    renouvelable: ordonnance.renouvelable,
    date: ordonnance.createdAt.toISOString(),
  };
};

const getOrdonnanceByAppointment = async ({ appointmentId, userId, role }) => {
  const ordonnance = await prisma.ordonnance.findUnique({
    where: { rendezVousId: appointmentId },
    include: {
      doctor: { select: { nomComplet: true, specialite: true } },
    },
  });

  if (!ordonnance) return null;

  // Authorization check
  if (role === 'PATIENT') {
    const patient = await prisma.patient.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!patient || ordonnance.patientId !== patient.id) {
      throw new HttpError(403, 'Access denied');
    }
  } else if (role === 'DOCTOR') {
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!doctor || ordonnance.doctorId !== doctor.id) {
      throw new HttpError(403, 'Access denied');
    }
  }

  return {
    ...mapOrdonnanceForClient(ordonnance),
    doctorName: ordonnance.doctor?.nomComplet || null,
  };
};

const resendOrdonnance = async ({ appointmentId, userId, role }) => {
  const appointment = await prisma.rendezVous.findUnique({
    where: { id: appointmentId },
    include: {
      ordonnance: true,
      patient: { include: { user: { select: { email: true, id: true } } } },
      doctor: { select: { nomComplet: true, userId: true, id: true } },
    },
  });

  if (!appointment?.ordonnance) {
    throw new HttpError(404, 'Aucune ordonnance pour ce rendez-vous');
  }

  if (role === 'DOCTOR') {
    const doctor = await getDoctorContext(userId);
    if (appointment.doctorId !== doctor.id) {
      throw new HttpError(403, 'Access denied');
    }
  } else if (role === 'PATIENT') {
    const patient = await prisma.patient.findUnique({ where: { userId }, select: { id: true } });
    if (!patient || appointment.patientId !== patient.id) {
      throw new HttpError(403, 'Access denied');
    }
  } else {
    throw new HttpError(403, 'Access denied');
  }

  const pdfPath = appointment.ordonnance.pdfPath;
  const patientEmail = appointment.patient?.user?.email;

  await sendOrdonnanceEmail({
    patientEmail,
    doctorName: appointment.doctor?.nomComplet,
    pdfPath: pdfPath && fs.existsSync(pdfPath) ? pdfPath : null,
    ordonnanceId: appointment.ordonnance.id,
  });

  if (appointment.patient?.user?.id) {
    await createNotification({
      userId: appointment.patient.user.id,
      type: 'SYSTEME',
      message: 'Votre ordonnance vous a été renvoyée par email.',
      metadata: {
        appointmentId,
        category: 'ORDONNANCE',
        event: 'RESENT',
        ordonnanceId: appointment.ordonnance.id,
      },
    });
  }

  return { sent: true };
};

const mapOrdonnanceForClient = (ordonnance) => {
  if (!ordonnance) return null;

  const pdfUrl = ordonnance.pdfPath
    ? `/uploads/ordonnances/${path.basename(ordonnance.pdfPath)}`
    : null;
  const uploadedFileUrl = ordonnance.uploadedFile
    ? `/uploads/ordonnances/${ordonnance.uploadedFile}`
    : null;
  const medicaments = Array.isArray(ordonnance.medicaments) ? ordonnance.medicaments : [];
  const hasUploadedFile = Boolean(ordonnance.uploadedFile);
  const hasWrittenMeds = medicaments.length > 0;

  return {
    id: ordonnance.id,
    medicaments,
    instructions: ordonnance.instructions,
    renouvelable: ordonnance.renouvelable,
    qrCode: ordonnance.qrCode,
    pdfUrl,
    uploadedFileUrl,
    documentUrl: pdfUrl || uploadedFileUrl,
    source: hasUploadedFile && !hasWrittenMeds ? 'UPLOADED' : 'GENERATED',
    createdAt:
      ordonnance.createdAt instanceof Date
        ? ordonnance.createdAt.toISOString()
        : ordonnance.createdAt,
  };
};

module.exports = {
  createOrdonnance,
  uploadOrdonnance,
  verifyOrdonnance,
  getOrdonnanceByAppointment,
  resendOrdonnance,
  mapOrdonnanceForClient,
};
