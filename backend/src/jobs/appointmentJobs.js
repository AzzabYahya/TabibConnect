const cron = require('node-cron');

const appointmentService = require('../services/appointmentService');

let jobsStarted = false;

const withSafeExecution = async (label, task) => {
  try {
    const processed = await task();
    if (processed > 0) {
      console.log(`[CRON] ${label}: ${processed} item(s) processed`);
    }
  } catch (error) {
    console.error(`[CRON] ${label} failed`, error);
  }
};

const startAppointmentJobs = () => {
  if (jobsStarted) {
    return;
  }

  cron.schedule('0 * * * *', async () => {
    await withSafeExecution('appointment-reminders-24h', () =>
      appointmentService.process24hReminders()
    );
  });

  cron.schedule('0 * * * *', async () => {
    await withSafeExecution('appointment-no-show', () =>
      appointmentService.processNoShowUpdates()
    );
  });

  jobsStarted = true;
  console.log('[CRON] Appointment jobs started');
};

module.exports = {
  startAppointmentJobs,
};
