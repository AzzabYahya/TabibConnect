const twilio = require('twilio');

const env = require('../config/env');

let twilioClient;

const getTwilioClient = () => {
  if (twilioClient) {
    return twilioClient;
  }

  if (!env.twilioAccountSid || !env.twilioAuthToken) {
    return null;
  }

  twilioClient = twilio(env.twilioAccountSid, env.twilioAuthToken);
  return twilioClient;
};

const isMoroccanPhoneNumber = (phoneNumber) => /^\+212[0-9]{9}$/.test(phoneNumber || '');

const sendSms = async ({ to, body }) => {
  if (!to || !body) {
    return { skipped: true, reason: 'Missing SMS recipient or message body' };
  }

  if (!isMoroccanPhoneNumber(to)) {
    return {
      skipped: true,
      reason: 'Destination phone is not a valid +212 Moroccan number',
    };
  }

  const client = getTwilioClient();

  if (!client || !env.twilioFrom) {
    // Local fallback when no provider credentials are configured.
    if (env.nodeEnv === 'development') {
      console.log(`[SMS MOCK] to=${to} body=${body}`);
    }
    return { skipped: true, reason: 'SMS provider credentials not configured' };
  }

  const response = await client.messages.create({
    to,
    from: env.twilioFrom,
    body,
  });

  return {
    sid: response.sid,
    status: response.status,
  };
};

module.exports = {
  sendSms,
};
