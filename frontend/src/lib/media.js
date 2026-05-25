export const getApiOrigin = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
  return apiUrl.replace(/\/api\/v1\/?$/, '');
};

export const resolveUploadUrl = (value) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const origin = getApiOrigin();
  return `${origin}${value.startsWith('/') ? value : `/${value}`}`;
};

export const getOrdonnanceVerifyUrl = (qrCode) => {
  const origin = getApiOrigin();
  return `${origin}/api/v1/ordonnance/verify/${qrCode}`;
};

export const getOrdonnanceDocumentUrl = (ordonnance) => {
  if (!ordonnance) return null;
  return resolveUploadUrl(ordonnance.documentUrl || ordonnance.pdfUrl || ordonnance.uploadedFileUrl);
};
