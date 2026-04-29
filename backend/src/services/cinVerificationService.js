const fs = require('fs/promises');
const path = require('path');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');

const env = require('../config/env');

const normalizeText = (value) => {
  if (!value) {
    return '';
  }

  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim();
};

const extractTextFromPdf = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  const parsed = await pdfParse(buffer);
  return parsed.text || '';
};

const extractTextFromImage = async (filePath) => {
  const worker = await createWorker(env.cinVerificationOcrLang, 1, {
    logger: () => {},
  });

  try {
    const result = await worker.recognize(filePath);
    return result?.data?.text || '';
  } finally {
    await worker.terminate();
  }
};

const extractCinText = async ({ filePath, mimeType }) => {
  if (!filePath) {
    return '';
  }

  const extension = path.extname(filePath).toLowerCase();
  const normalizedMime = String(mimeType || '').toLowerCase();

  if (normalizedMime === 'application/pdf' || extension === '.pdf') {
    return extractTextFromPdf(filePath);
  }

  return extractTextFromImage(filePath);
};

const computeVerificationScore = ({ extractedText, expectedCin }) => {
  const normalizedText = normalizeText(extractedText);
  const normalizedCin = normalizeText(expectedCin);
  const keywords = env.cinVerificationKeywords || [];

  let score = 0;
  const signals = [];

  if (normalizedCin) {
    if (normalizedText.includes(normalizedCin)) {
      score += 3;
      signals.push('cin_match');
    } else {
      signals.push('cin_missing');
    }
  }

  const keywordMatches = keywords.filter((keyword) => normalizedText.includes(normalizeText(keyword)));
  score += keywordMatches.length;

  if (keywordMatches.length) {
    signals.push(`keywords:${keywordMatches.join(',')}`);
  } else {
    signals.push('keywords_missing');
  }

  return { score, signals };
};

const verifyCinDocument = async ({ file, expectedCin }) => {
  if (!file?.path) {
    return {
      status: 'REJECTED',
      score: 0,
      note: 'missing_file',
    };
  }

  let extractedText = '';

  try {
    extractedText = await extractCinText({
      filePath: file.path,
      mimeType: file.mimetype,
    });
  } catch (error) {
    return {
      status: env.cinVerificationStrict ? 'REJECTED' : 'NEEDS_REVIEW',
      score: 0,
      note: 'ocr_failed',
    };
  }

  if (!extractedText) {
    return {
      status: env.cinVerificationStrict ? 'REJECTED' : 'NEEDS_REVIEW',
      score: 0,
      note: 'empty_text',
    };
  }

  const { score, signals } = computeVerificationScore({
    extractedText,
    expectedCin,
  });

  const status = score >= env.cinVerificationMinScore ? 'VERIFIED' : 'REJECTED';

  return {
    status,
    score,
    note: signals.join('|'),
  };
};

module.exports = {
  verifyCinDocument,
};
