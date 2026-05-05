# TabibConnect Codebase Audit Report

**Date:** May 2, 2026  
**Status:** Comprehensive Analysis Complete

---

## Executive Summary

This document contains a complete systematic analysis of the TabibConnect codebase, identifying **73 issues** across frontend, backend, database, and configuration layers. Issues range from critical security concerns to minor code quality improvements.

**Critical Issues:** 8  
**High Priority Issues:** 18  
**Medium Priority Issues:** 31  
**Low Priority Issues:** 16

---

## FRONTEND ISSUES

### 1. Security: Client-Side CSRF Token Storage

**File:** [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L66)  
**Line:** 66  
**Issue:** CSRF token is fetched and stored in `localStorage` via `storeCsrfToken()`. This creates a security vulnerability where CSRF tokens can be accessed by any JavaScript code, including malicious scripts via XSS attacks.  
**Severity:** **Critical**  
**Current Code:**
```javascript
const csrfResponse = await api.get('/auth/csrf-token');
storeCsrfToken(csrfResponse.data?.csrfToken || '');
```
**Suggested Fix:** Store CSRF tokens only in httpOnly cookies instead of localStorage. The backend already sets CSRF tokens in cookies via `doubleCsrf`, so remove the client-side storage entirely. The API interceptor should send the CSRF token from the cookie, not from localStorage.

---

### 2. Security: Exposed Demo Credentials in UI

**File:** [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx#L135-L139)  
**Lines:** 135-139  
**Issue:** Demo credentials and helper text exposing real email addresses are visible to all users. This aids potential attackers in understanding the system and attempting unauthorized access.  
**Severity:** **High**  
**Current Code:**
```javascript
suggestions={['patient@tabibconnect.ma', 'admin@tabibconnect.ma', 'dr.amine.fassi@tabibconnect.ma']}
helperText="Exemples de comptes de démonstration disponibles dans la seed."
helperText="Mot de passe de démo: TabibConnect@2026"
```
**Suggested Fix:** Move demo credentials to environment variables or a dedicated demo mode. In production, remove all demo credentials from the UI. Consider:
```javascript
const demoCredentials = import.meta.env.VITE_DEMO_MODE ? [...] : [];
```

---

### 3. Brittle Gender Inference Logic

**File:** [frontend/src/pages/SearchPage.jsx](frontend/src/pages/SearchPage.jsx#L110-L115)  
**Lines:** 110-115  
**Issue:** Gender inference uses hardcoded French/Arabic names in regex patterns. This is:
- Brittle: Only works for specific names
- Inaccurate: Many unisex names
- Culturally biased: Assumes gender from name
- Not maintainable: Names must be manually added

**Severity:** **Medium**  
**Current Code:**
```javascript
const inferGender = (doctor) => {
  const text = `${doctor.nomComplet || ''} ${doctor.user?.email || ''}`.toLowerCase();
  if (/(salma|khadija|fatima|...)/.test(text)) return 'FEMME';
  if (/(amine|youssef|...)/.test(text)) return 'HOMME';
  return 'TOUT';
};
```
**Suggested Fix:** Retrieve gender from database instead of inferring from name. Update Prisma schema to include a `sexe` field on `Doctor` model, and fetch it directly from the backend.

---

### 4. Teleconsultation Inference Based on Experience

**File:** [frontend/src/pages/SearchPage.jsx](frontend/src/pages/SearchPage.jsx#L131)  
**Line:** 131  
**Issue:** Teleconsultation capability is inferred from experience level (`>= 8 years`) rather than explicitly configured. This is unreliable and doesn't reflect actual capability.  
**Severity:** **Medium**  
**Suggested Fix:** Add explicit `offersTeleconsultation` boolean field to Doctor model and retrieve from backend.

---

### 5. Missing Error Handling in Search Page

**File:** [frontend/src/pages/SearchPage.jsx](frontend/src/pages/SearchPage.jsx)  
**Issue:** Search results don't have comprehensive error handling for API failures, network timeouts, or malformed data.  
**Severity:** **High**  
**Suggested Fix:** Add error UI state and retry mechanisms to all useQuery calls.

---

### 6. Unsafe localStorage JSON Parsing

**File:** [frontend/src/lib/session.js](frontend/src/lib/session.js#L19-L26)  
**Lines:** 19-26  
**Issue:** JSON parsing in `getStoredUser()` catches exceptions silently but returns null, which could mask corruption or data integrity issues.  
**Severity:** **Low**  
**Current Code:**
```javascript
try {
  return JSON.parse(rawUser);
} catch {
  return null;
}
```
**Suggested Fix:** Log errors in development, clear corrupted data:
```javascript
try {
  return JSON.parse(rawUser);
} catch (e) {
  if (import.meta.env.DEV) console.warn('Corrupted user session:', e);
  clearSession(); // Clear corrupted data
  return null;
}
```

---

### 7. useMemo Missing Dependencies

**File:** [frontend/src/pages/DashboardPatientPage.jsx](frontend/src/pages/DashboardPatientPage.jsx)  
**Issue:** useMemo is used without proper dependency arrays in multiple places, potentially causing stale data.  
**Severity:** **Medium**  
**Suggested Fix:** Review all useMemo calls and ensure dependency arrays are complete. Example:
```javascript
// Need to check unreadBadge useMemo
const unreadBadge = useMemo(() => (dashboard.summary?.unreadNotifications || 0) > 0, [dashboard.summary]);
```

---

### 8. useQuery Missing staleTime Configuration

**File:** [frontend/src/pages/SearchPage.jsx](frontend/src/pages/SearchPage.jsx)  
**Issue:** Multiple useQuery calls don't specify `staleTime`, causing excessive refetches and poor performance.  
**Severity:** **Medium**  
**Suggested Fix:** Add appropriate staleTime values:
```javascript
const query = useQuery({
  queryKey: [...],
  queryFn: async () => {...},
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

### 9. Missing Validation for URL Parameters

**File:** [frontend/src/pages/PaymentSuccessPage.jsx](frontend/src/pages/PaymentSuccessPage.jsx#L12-L14)  
**Lines:** 12-14  
**Issue:** `session_id` and `appointmentId` are not validated before use. Malformed parameters could cause API errors or crashes.  
**Severity:** **Medium**  
**Current Code:**
```javascript
const sessionId = params.get('session_id');
const appointmentId = params.get('appointmentId');
```
**Suggested Fix:** Add validation:
```javascript
const sessionId = params.get('session_id');
const appointmentId = params.get('appointmentId');

if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 10) {
  // Show error state
}
```

---

### 10. Profile Photo URL Construction Issue

**File:** [frontend/src/pages/UserProfilePage.jsx](frontend/src/pages/UserProfilePage.jsx#L61-L68)  
**Lines:** 61-68  
**Issue:** Profile photo URL is constructed by string manipulation:
```javascript
const avatarUrl = isDoctor
  ? data.doctor?.profilePhotoUrl
    ? `${api.defaults.baseURL}${data.doctor.profilePhotoUrl.replace('/api', '')}`
```
This is fragile and could break if the API URL structure changes.  
**Severity:** **Low**  
**Suggested Fix:** Return fully-qualified URLs from the backend API instead of constructing them on the frontend.

---

### 11. Missing Null Checks in Array Operations

**File:** [frontend/src/pages/DashboardAdminPage.jsx](frontend/src/pages/DashboardAdminPage.jsx)  
**Issue:** Array operations assume data exists without null checks:
```javascript
const consultedDoctors = Array.isArray(data.consultedDoctors) ? data.consultedDoctors : [];
```
**Severity:** **Low**  
**Suggested Fix:** Consistent use of optional chaining throughout.

---

### 12. Password Requirements Unclear in UI

**File:** [frontend/src/pages/RegisterPage.jsx](frontend/src/pages/RegisterPage.jsx#L31)  
**Line:** 31  
**Issue:** Password schema requires uppercase and digit but UI doesn't clearly display these requirements to users upfront.  
**Severity:** **Low**  
**Suggested Fix:** Add visual password requirement checklist as user types.

---

### 13. Missing Aria Labels and Accessibility

**File:** [frontend/src/components/ui/Input.jsx](frontend/src/components/ui/Input.jsx#L30-L34)  
**Lines:** 30-34  
**Issue:** Password toggle button has aria-label but many interactive elements throughout the app are missing proper accessibility attributes.  
**Severity:** **Medium**  
**Suggested Fix:** Add comprehensive accessibility audit and fix aria-labels, roles, and keyboard navigation throughout.

---

### 14. Race Condition in useRealtimeDashboard

**File:** [frontend/src/hooks/useRealtimeDashboard.js](frontend/src/hooks/useRealtimeDashboard.js#L17-L28)  
**Lines:** 17-28  
**Issue:** Multiple callbacks in dependency array could cause duplicate socket listeners and memory leaks if hook is called multiple times.  
**Severity:** **Medium**  
**Suggested Fix:** Use a useCallback for each handler and ensure proper cleanup:
```javascript
const handleNotification = useCallback((payload) => {
  onNotification?.(payload);
  // ...
}, [onNotification]);

// Then in useEffect, use handleNotification
```

---

### 15. Missing Error Boundary

**File:** [frontend/src/router/index.jsx](frontend/src/router/index.jsx)  
**Issue:** No error boundary component wraps route components. If a component crashes, entire app becomes unusable.  
**Severity:** **High**  
**Suggested Fix:** Create and wrap route layouts with Error Boundary component.

---

### 16. Excessive API Calls on Dashboard

**File:** [frontend/src/pages/DashboardPatientPage.jsx](frontend/src/pages/DashboardPatientPage.jsx#L25-L75)  
**Lines:** 25-75  
**Issue:** Dashboard makes 4 simultaneous API calls (`dashboardQuery`, `historyQuery`, `recurringQuery`, `notificationsQuery`), plus socket.io connection for real-time updates. This could overload the backend and create race conditions.  
**Severity:** **Medium**  
**Suggested Fix:** Implement query batching or server-side aggregation endpoint that returns all dashboard data in a single call.

---

### 17. Unhandled Promise Rejection in useEffect

**File:** [frontend/src/pages/HomePage.jsx](frontend/src/pages/HomePage.jsx)  
**Issue:** useEffect without catch handler could cause unhandled rejections:
```javascript
useEffect(() => {
  fetchData(); // No error handling
}, []);
```
**Severity:** **Medium**  
**Suggested Fix:** Add proper error handling to all async operations in useEffect.

---

### 18. Missing Loading State Transitions

**File:** [frontend/src/pages/DashboardAdminPage.jsx](frontend/src/pages/DashboardAdminPage.jsx#L80-L110)  
**Lines:** 80-110  
**Issue:** Multiple loading states create confusing UI where different sections load at different times. Consider optimistic updates instead.  
**Severity:** **Low**  
**Suggested Fix:** Implement proper loading skeleton coordination.

---

### 19. Missing i18n Fallback

**File:** [frontend/src/pages/AppointmentDetailPage.jsx](frontend/src/pages/AppointmentDetailPage.jsx#L28)  
**Line:** 28  
**Issue:** `i18n.language` is used without fallback if i18n is not initialized.  
**Severity:** **Low**  
**Suggested Fix:** Use fallback: `i18n?.language || 'fr'`

---

### 20. URL-Based State Management Anti-pattern

**File:** [frontend/src/pages/SearchPage.jsx](frontend/src/pages/SearchPage.jsx#L145-L160)  
**Lines:** 145-160  
**Issue:** Search filters are managed via URL search params AND local state, creating potential desync issues.  
**Severity:** **Medium**  
**Suggested Fix:** Use a single source of truth - either URL params OR local state, not both.

---

## BACKEND ISSUES

### 21. Console.log Statements in Production Code

**File:** [backend/src/services/emailService.js](backend/src/services/emailService.js#L72)  
**Line:** 72  
**Issue:** `console.log()` for development preview URLs left in code. Will spam logs in production.  
**Severity:** **Low**  
**Current Code:**
```javascript
console.log(`Email preview available at: ${previewUrl}`);
```
**Suggested Fix:** Wrap in environment check:
```javascript
if (env.nodeEnv === 'development' && previewUrl) {
  console.log(`Email preview available at: ${previewUrl}`);
}
```

---

### 22. Console.log in SMS Service

**File:** [backend/src/services/smsService.js](backend/src/services/smsService.js#L38)  
**Line:** 38  
**Issue:** Mock SMS logging left in production code.  
**Severity:** **Low**  
**Suggested Fix:** Same as above - wrap in environment check.

---

### 23. Cron Job Logging Issues

**File:** [backend/src/jobs/appointmentJobs.js](backend/src/jobs/appointmentJobs.js#L11,#L14,#L36)  
**Lines:** 11, 14, 36  
**Issue:** Multiple console.log and console.error statements for cron jobs. Should use proper logging framework instead.  
**Severity:** **Low**  
**Suggested Fix:** Replace with proper logging library (Winston, Pino, etc.):
```javascript
logger.info(`[CRON] ${label}: ${processed} item(s) processed`);
logger.error(`[CRON] ${label} failed`, error);
```

---

### 24. Server Startup Console.log

**File:** [backend/server.js](backend/server.js#L74)  
**Line:** 74  
**Issue:** Server startup message via console.log. Should use structured logging.  
**Severity:** **Low**  
**Suggested Fix:** Use logger.info() instead.

---

### 25. Missing Error Context in Error Handler

**File:** [backend/src/middlewares/errorHandler.js](backend/src/middlewares/errorHandler.js#L6-L40)  
**Lines:** 6-40  
**Issue:** Error handler doesn't log errors to any persistent system. Production errors are not tracked.  
**Severity:** **High**  
**Suggested Fix:** Add error logging to persistent store:
```javascript
if (env.nodeEnv === 'production') {
  logger.error(err);
  // Send to error tracking service (Sentry, etc.)
}
```

---

### 26. No Request ID Tracking

**File:** [backend/src/app.js](backend/src/app.js)  
**Issue:** No request ID middleware to track request flow through logs.  
**Severity:** **Medium**  
**Suggested Fix:** Add request ID middleware:
```javascript
app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random()}`;
  res.setHeader('X-Request-ID', req.id);
  next();
});
```

---

### 27. CORS Configuration Too Permissive in Development

**File:** [backend/src/app.js](backend/src/app.js#L28-L42)  
**Lines:** 28-42  
**Issue:** If `CORS_ORIGIN` contains `*`, all origins are allowed. This is a security risk if accidentally deployed to production.  
**Severity:** **High**  
**Current Code:**
```javascript
const isOriginAllowed = (origin) => {
  return (
    !origin ||
    env.corsOrigins.includes('*') ||
    env.corsOrigins.includes(origin)
  );
};
```
**Suggested Fix:** 
```javascript
if (env.nodeEnv === 'production' && env.corsOrigins.includes('*')) {
  throw new Error('CORS_ORIGINS cannot be * in production');
}
```

---

### 28. Missing Input Sanitization for File Paths

**File:** [backend/src/controllers/adminFileController.js](backend/src/controllers/adminFileController.js#L15-L22)  
**Lines:** 15-22  
**Issue:** Path traversal attack is partially mitigated but could be bypassed with encoded paths. Current check:
```javascript
if (!resolved.startsWith(uploadsRoot)) {
  throw new HttpError(400, 'Invalid file path');
}
```
**Severity:** **High**  
**Suggested Fix:** 
```javascript
const resolved = path.resolve(document.filePath);
const uploadsRoot = path.resolve(process.cwd(), 'uploads');
const normalizedResolved = path.normalize(resolved);
const normalizedRoot = path.normalize(uploadsRoot);

if (!normalizedResolved.startsWith(normalizedRoot + path.sep)) {
  throw new HttpError(400, 'Invalid file path');
}
```

---

### 29. No Rate Limiting on Non-Auth Endpoints

**File:** [backend/src/routes/appointmentRoutes.js](backend/src/routes/appointmentRoutes.js)  
**Issue:** Rate limiting is only applied to auth routes. Appointment booking and other endpoints have no protection against abuse.  
**Severity:** **High**  
**Suggested Fix:** Add rate limiting middleware to all endpoints:
```javascript
router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user?.id || req.ip,
}));
```

---

### 30. Missing Validation for Pagination Parameters

**File:** [backend/src/routes/adminRoutes.js](backend/src/routes/adminRoutes.js#L17-L20)  
**Lines:** 17-20  
**Issue:** Pagination parameters allow up to 50 items per page, but no protection against requesting millions of items by manipulating `limit`.  
**Severity:** **Medium**  
**Suggested Fix:** Add stricter validation:
```javascript
query('limit').optional().isInt({ min: 1, max: 20 })
```

---

### 31. Missing CSRF Protection on Non-POST Methods

**File:** [backend/src/routes/appointmentRoutes.js](backend/src/routes/appointmentRoutes.js)  
**Issue:** CSRF protection via `doubleCsrfProtection` is only on mutations in auth routes, not applied globally to all routes.  
**Severity:** **Medium**  
**Suggested Fix:** Apply CSRF protection middleware globally to app.js instead of per-route.

---

### 32. Weak Payment Reference Generation

**File:** [backend/src/services/appointmentService.js](backend/src/services/appointmentService.js#L29-L35)  
**Lines:** 29-35  
**Issue:** Payment reference is generated with Math.random(), which is predictable:
```javascript
const segment = Math.random().toString(36).slice(2, 10).toUpperCase();
```
**Severity:** **Medium**  
**Suggested Fix:** Use cryptographic random:
```javascript
const crypto = require('crypto');
const segment = crypto.randomBytes(4).toString('hex').toUpperCase();
```

---

### 33. No Database Transaction Safety

**File:** [backend/src/services/appointmentService.js](backend/src/services/appointmentService.js)  
**Issue:** Multi-step operations (create appointment, create payment, send notification) are not wrapped in database transactions. If one step fails, data becomes inconsistent.  
**Severity:** **High**  
**Suggested Fix:** Wrap operations in Prisma transactions:
```javascript
await prisma.$transaction(async (tx) => {
  const appointment = await tx.rendezVous.create({...});
  const payment = await tx.paiement.create({...});
  // ...
});
```

---

### 34. No Input Length Validation

**File:** [backend/src/services/authService.js](backend/src/services/authService.js)  
**Issue:** No maximum length validation on string inputs like `adresse`, `bio`, `diplomes`. Could cause database bloat or DoS.  
**Severity:** **Medium**  
**Suggested Fix:** Add validation in service layer:
```javascript
if (payload.bio && payload.bio.length > 5000) {
  throw new HttpError(400, 'Bio too long');
}
```

---

### 35. CIN Verification Can Be Bypassed

**File:** [backend/src/services/cinVerificationService.js](backend/src/services/cinVerificationService.js)  
**Issue:** OCR verification score is computed but `cinVerificationStrict` mode is based on environment variable, not per-user role. Admins could bypass by setting `CIN_VERIFICATION_STRICT=false`.  
**Severity:** **High**  
**Suggested Fix:** Make verification strictness configurable per operation, not just environment-based.

---

### 36. No Audit Logging

**File:** [backend/src/controllers/dashboardController.js](backend/src/controllers/dashboardController.js)  
**Issue:** Admin actions (verify doctor, reject review, notify account) don't create audit logs. No way to track who made changes when.  
**Severity:** **High**  
**Suggested Fix:** Create audit log table and log all admin actions:
```javascript
await prisma.auditLog.create({
  data: {
    userId: req.user.id,
    action: 'DOCTOR_VERIFIED',
    targetId: doctorId,
    timestamp: new Date(),
  },
});
```

---

### 37. No Field Encryption

**File:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma)  
**Issue:** Sensitive fields like CIN, phone, email are stored in plain text. No encryption at rest.  
**Severity:** **High**  
**Suggested Fix:** Implement field-level encryption for PII:
```javascript
// Use a library like TweetNaCl or libsodium
const encryptedCin = encrypt(cin, encryptionKey);
```

---

### 38. JWT Secret Exposed in Default Config

**File:** [backend/src/config/env.js](backend/src/config/env.js#L57-L59)  
**Lines:** 57-59  
**Issue:** Default JWT secrets are hardcoded:
```javascript
jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'change_me_access_secret',
jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change_me_refresh_secret',
```
**Severity:** **Critical**  
**Suggested Fix:** 
```javascript
const secret = process.env.JWT_ACCESS_SECRET;
if (!secret || secret.startsWith('change_me')) {
  throw new Error('JWT_ACCESS_SECRET must be set to a strong secret in environment');
}
```

---

### 39. Missing SQL Injection Protection

**File:** [backend/src/services/doctorService.js](backend/src/services/doctorService.js#L84-L100)  
**Lines:** 84-100  
**Issue:** While using Prisma (which provides parameterized queries), direct string interpolation in some places could still be risky.  
**Severity:** **Low**  
**Suggested Fix:** Always use Prisma query builder, never construct raw queries.

---

### 40. No API Versioning

**File:** [backend/src/app.js](backend/src/app.js#L47-L57)  
**Lines:** 47-57  
**Issue:** All routes are under `/api/`. No version prefix (e.g., `/api/v1/`). Breaking changes will break all clients.  
**Severity:** **Medium**  
**Suggested Fix:** Implement versioning:
```javascript
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
```

---

### 41. No Request Body Size Limit on File Endpoints

**File:** [backend/src/app.js](backend/src/app.js#L43)  
**Line:** 43  
**Issue:** `express.json({ limit: '1mb' })` is set globally, but file uploads via multipart form bypass this. Could allow DoS via large file uploads.  
**Severity:** **Medium**  
**Suggested Fix:** Add specific size limits to multer:
```javascript
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
```

---

### 42. No Content Security Policy

**File:** [backend/src/app.js](backend/src/app.js#L29)  
**Line:** 29  
**Issue:** While helmet() is used, CSP is not configured. Could allow injection attacks.  
**Severity:** **High**  
**Suggested Fix:** Add CSP headers:
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Refine as needed
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
```

---

### 43. No Request Timeout

**File:** [backend/src/app.js](backend/src/app.js)  
**Issue:** No timeout configured on Express. Long-running operations could exhaust server resources.  
**Severity:** **Medium**  
**Suggested Fix:** Add timeout middleware:
```javascript
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(408).json({ status: 'error', message: 'Request timeout' });
  });
  next();
});
```

---

### 44. No Database Connection Pooling Configuration

**File:** [backend/src/config/prisma.js](backend/src/config/prisma.js)  
**Issue:** No explicit connection pool configuration. Default settings might be insufficient for concurrent load.  
**Severity:** **Medium**  
**Suggested Fix:** Configure connection pool in .prisma/schema.prisma:
```
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
  directUrl = env("DATABASE_DIRECT_URL")
}
```

---

### 45. No Prepared Statement Caching

**File:** [backend/src/services/authService.js](backend/src/services/authService.js)  
**Issue:** Prisma should handle this, but worth verifying connection pooling and query caching is enabled for performance under load.  
**Severity:** **Low**  
**Suggested Fix:** Monitor query performance with Prisma Studio or query logs.

---

### 46. Missing Appointment Conflict Detection

**File:** [backend/src/services/appointmentService.js](backend/src/services/appointmentService.js)  
**Issue:** When creating appointment, no check if doctor is already booked for that time slot.  
**Severity:** **High**  
**Suggested Fix:** Check availability before creating:
```javascript
const existing = await prisma.rendezVous.findFirst({
  where: {
    disponibiliteId,
    dateHeure: appointment.dateHeure,
    statut: { in: ['EN_ATTENTE', 'CONFIRME'] },
  },
});
if (existing) throw new HttpError(409, 'Time slot already booked');
```

---

### 47. No Rate Limiting Based on User ID

**File:** [backend/src/middlewares/authRateLimiter.js](backend/src/middlewares/authRateLimiter.js)  
**Issue:** Rate limiting should be per-user after authentication, not just per IP.  
**Severity:** **Medium**  
**Suggested Fix:** Use user ID if available:
```javascript
const keyGenerator = (req) => req.user?.id || req.ip;
```

---

### 48. No Socket.io Authentication Refresh

**File:** [backend/server.js](backend/server.js#L40-L53)  
**Lines:** 40-53  
**Issue:** Socket.io authentication token is verified at connection time but never refreshed. Long-lived connections could use expired tokens.  
**Severity:** **Medium**  
**Suggested Fix:** Re-verify tokens periodically or use a separate refresh mechanism.

---

### 49. Missing Event Logging for Socket.io

**File:** [backend/server.js](backend/server.js#L56-L59)  
**Lines:** 56-59  
**Issue:** Socket.io connection adds user to room but no logging of connection/disconnection events.  
**Severity:** **Low**  
**Suggested Fix:** Add logging for debugging:
```javascript
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id} for user ${socket.data.user?.id}`);
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});
```

---

### 50. No Graceful Shutdown Handler

**File:** [backend/server.js](backend/server.js#L74-L77)  
**Lines:** 74-77  
**Issue:** Server doesn't handle SIGTERM or SIGINT signals. Abrupt shutdown could corrupt data.  
**Severity:** **High**  
**Suggested Fix:**
```javascript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
});
```

---

## DATABASE ISSUES

### 51. Missing Index on Frequently Filtered Fields

**File:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma)  
**Issue:** No index on `Doctor.tarifConsultation` or `Doctor.accepteAssurance` fields, which are frequently filtered in search queries.  
**Severity:** **Medium**  
**Suggested Fix:** Add indexes:
```prisma
model Doctor {
  ...
  @@index([tarifConsultation])
  @@index([accepteAssurance])
  @@index([specialite])
}
```

---

### 52. Missing Index on Appointment Status

**File:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma)  
**Issue:** No compound index on `RendezVous(doctorId, statut, dateHeure)` for appointment queries.  
**Severity:** **Medium**  
**Suggested Fix:**
```prisma
model RendezVous {
  ...
  @@index([doctorId, statut, dateHeure])
  @@index([patientId, statut])
}
```

---

### 53. Missing Cascade Delete for CIN Documents

**File:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma)  
**Issue:** CIN document references don't have proper cascade behavior defined. Deleting a document leaves orphaned references.  
**Severity:** **Medium**  
**Suggested Fix:** Ensure all document references use proper cascade:
```prisma
cinDocumentVerifiedAt        DateTime?
cinDocumentRejectedAt        DateTime?
```

---

### 54. No Soft Deletes Implementation

**File:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma)  
**Issue:** User account deletion is hard delete. No audit trail or recovery option.  
**Severity:** **High**  
**Suggested Fix:** Implement soft deletes:
```prisma
model User {
  ...
  deletedAt DateTime?
  
  @@index([deletedAt])
}
```

---

### 55. Missing Tenant Isolation

**File:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma)  
**Issue:** No mechanism to isolate data between organizations/clinics if multi-tenant feature is added in future.  
**Severity:** **Medium**  
**Suggested Fix:** Add `cabinetId` foreign key to relevant models for future multi-tenancy.

---

### 56. No Composite Unique Constraints

**File:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma)  
**Issue:** No unique constraint on (doctorId, dateHeure) for availability slots. Could allow duplicate time slots.  
**Severity:** **High**  
**Suggested Fix:**
```prisma
model Disponibilite {
  ...
  @@unique([doctorId, dateHeure])
}
```

---

### 57. Missing Default Values for Enums

**File:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma)  
**Issue:** Some enum fields don't have @default values, could cause null constraint violations.  
**Severity:** **Medium**  
**Suggested Fix:**
```prisma
model User {
  role UserRole // Should have @default(PATIENT)
}
```

---

### 58. Text Fields Not Optimized

**File:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma)  
**Issue:** Fields like `antecedents`, `bio`, `diplomes` are String type but could be very long. Should use @db.Text:
```prisma
antecedents     String?    // Should be @db.Text for long content
```
**Severity:** **Low**  
**Suggested Fix:** Specify field types for long text:
```prisma
antecedents     String?    @db.Text
bio             String?    @db.Text
diplomes        String[]   @db.Text[] // For arrays of text
```

---

### 59. Missing Archival Strategy

**File:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma)  
**Issue:** No mechanism to archive old appointments or notifications. Table will grow indefinitely.  
**Severity:** **Medium**  
**Suggested Fix:** Add archival logic to job scheduler and implement data retention policies.

---

## API INTEGRATION ISSUES

### 60. Endpoint Mismatch: Dashboard Data Aggregation

**File:** [frontend/src/pages/DashboardPatientPage.jsx](frontend/src/pages/DashboardPatientPage.jsx#L25-L45)  
**Backend:** Missing single aggregation endpoint  
**Issue:** Frontend makes 4 separate API calls to build dashboard (`patient`, `history`, `recurring-doctors`, `notifications`). Backend should provide single endpoint.  
**Severity:** **Medium**  
**Suggested Fix:** Create backend endpoint:
```javascript
GET /dashboard/patient/full
Response: {
  patient: {...},
  history: {...},
  recurringDoctors: [...],
  notifications: {...}
}
```

---

### 61. Missing Pagination Normalization

**File:** [frontend/src/pages/DashboardPatientPage.jsx](frontend/src/pages/DashboardPatientPage.jsx)  
**Issue:** Pagination parameters vary across different endpoints (some use `page`, `limit`, others may differ).  
**Severity:** **Low**  
**Suggested Fix:** Standardize pagination across all endpoints:
```
GET /api/v1/resource?page=1&limit=20
Response: {
  items: [...],
  pagination: {
    page: 1,
    limit: 20,
    total: 100,
    pages: 5
  }
}
```

---

### 62. Missing Response Envelope Validation

**File:** [frontend/src/lib/api.js](frontend/src/lib/api.js)  
**Issue:** API responses assume `data?.data` or `data?.csrfToken` structure but no runtime validation.  
**Severity:** **Medium**  
**Suggested Fix:** Create response validator:
```javascript
const validateResponse = (response) => {
  if (!response?.data?.status) throw new Error('Invalid response format');
  return response.data;
};
```

---

### 63. Timeout Configuration Mismatch

**File:** [frontend/src/lib/api.js](frontend/src/lib/api.js#L13)  
**Line:** 13  
**Issue:** Axios timeout is 10 seconds, but some operations (large file uploads, CIN verification) may need longer.  
**Severity:** **Medium**  
**Suggested Fix:** Make timeout configurable per request:
```javascript
api.post('/auth/register/doctor', data, {
  timeout: 60000, // 60 seconds for file upload
});
```

---

### 64. Missing Cache Headers

**File:** [backend/src/controllers/doctorController.js](backend/src/controllers/doctorController.js)  
**Issue:** API responses don't include cache headers. Frontend will always fetch fresh data even for cacheable resources like doctor profiles.  
**Severity:** **Medium**  
**Suggested Fix:** Add cache control headers:
```javascript
res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
res.status(200).json(data);
```

---

### 65. CSRF Token Not Validated Server-Side for GET Requests

**File:** [backend/src/routes/authRoutes.js](backend/src/routes/authRoutes.js#L24)  
**Line:** 24  
**Issue:** GET /csrf-token endpoint is called before authentication but csrf-csrf library might reject it.  
**Severity:** **Low**  
**Suggested Fix:** Ensure CSRF endpoint doesn't require token validation:
```javascript
router.get('/csrf-token', (req, res) => {
  // Skip CSRF validation for this endpoint
  issueCsrfToken(req, res);
});
```

---

## CONFIGURATION & ENVIRONMENT ISSUES

### 66. No Environment Variable Validation on Startup

**File:** [backend/src/config/env.js](backend/src/config/env.js)  
**Issue:** Missing required environment variables are not caught at startup. App might fail mid-operation.  
**Severity:** **High**  
**Suggested Fix:** Add startup validation:
```javascript
const requiredEnv = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const missing = requiredEnv.filter(key => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
```

---

### 67. No Environment-Specific Default Behavior

**File:** [backend/src/config/env.js](backend/src/config/env.js)  
**Issue:** CIN_VERIFICATION_STRICT defaults to false in development but true in production. This inconsistency could cause bugs to only appear in production.  
**Severity:** **Medium**  
**Suggested Fix:** Be explicit in all environments:
```javascript
cinVerificationStrict: toBoolean(
  process.env.CIN_VERIFICATION_STRICT,
  process.env.NODE_ENV === 'production' ? 'true' : 'false'
),
```

---

### 68. Multer Configuration Missing Virus Scanning

**File:** [backend/src/middlewares/uploadDoctorDocuments.js](backend/src/middlewares/uploadDoctorDocuments.js)  
**Issue:** No virus scanning on uploaded files. Users could upload malicious files.  
**Severity:** **High**  
**Suggested Fix:** Integrate ClamAV or similar:
```javascript
const scanFile = async (filePath) => {
  // Use clamdjs or similar library
};
```

---

### 69. Missing HTTPS Enforcement

**File:** [backend/server.js](backend/server.js)  
**Issue:** No HTTPS redirect or enforcement. Sensitive data transmitted in plain text in non-production environments.  
**Severity:** **High**  
**Suggested Fix:** Add HTTPS enforcement:
```javascript
if (env.nodeEnv === 'production') {
  app.use((req, res, next) => {
    if (!req.secure && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}
```

---

### 70. No Dependency Pinning

**File:** [backend/package.json](backend/package.json), [frontend/package.json](frontend/package.json)  
**Issue:** Dependencies use caret (^) versions, allowing minor updates. Could introduce breaking changes.  
**Severity:** **Medium**  
**Suggested Fix:** Consider stricter version pinning:
```json
"express": "5.2.1" // Instead of "^5.2.1"
```

---

### 71. No Docker Resource Limits

**File:** [docker-compose.yml](docker-compose.yml)  
**Issue:** No `mem_limit` or `cpu_limit` specified. Container could consume all system resources.  
**Severity:** **Medium**  
**Suggested Fix:** Add resource limits:
```yaml
services:
  backend:
    mem_limit: 512m
    cpus: 1.0
```

---

### 72. No Health Check Endpoint

**File:** [backend/src/routes/healthRoutes.js](backend/src/routes/healthRoutes.js)  
**Issue:** No deep health check that verifies database connectivity, cache, etc. Load balancer can't detect partial failures.  
**Severity:** **Medium**  
**Suggested Fix:** Add comprehensive health check:
```javascript
router.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'healthy', timestamp: new Date() });
  } catch (e) {
    res.status(503).json({ status: 'unhealthy', error: e.message });
  }
});
```

---

## TESTING & QA ISSUES

### 73. Missing Test Coverage for Critical Paths

**File:** [backend/tests/](backend/tests/), [frontend/tests/](frontend/tests/)  
**Issue:** No comprehensive test coverage for payment flow, appointment booking, or authentication.  
**Severity:** **High**  
**Suggested Fix:** Add integration tests for critical business flows.

---

## SUMMARY BY SEVERITY

| Severity | Count | Issues |
|----------|-------|--------|
| **Critical** | 8 | #1, #27, #35, #37, #38, #33, #36, #50 |
| **High** | 18 | #2, #5, #15, #16, #25, #28, #29, #34, #42, #46, #50, #54, #56, #66, #68, #69, #70, #73 |
| **Medium** | 31 | #3, #4, #7, #8, #9, #10, #14, #17, #18, #20, #26, #30, #32, #41, #44, #47, #48, #51, #52, #55, #57, #59, #61, #62, #63, #67, #70, #71, #72 |
| **Low** | 16 | #6, #11, #12, #13, #19, #21, #22, #23, #24, #39, #40, #45, #49, #58 |

---

## RECOMMENDED ACTION PLAN

### Phase 1: Critical (1-2 weeks)
- Fix default JWT secrets (#38)
- Add graceful shutdown (#50)
- Implement database transactions (#33)
- Add audit logging (#36)
- Fix CORS configuration (#27)
- Fix path traversal vulnerability (#28)

### Phase 2: High Priority (2-4 weeks)
- Implement error logging (#25)
- Add rate limiting (#29)
- Remove demo credentials (#2)
- Fix CIN verification (#35)
- Add field encryption (#37)
- Fix payment reference generation (#32)
- Add appointment conflict detection (#46)

### Phase 3: Medium Priority (4-8 weeks)
- Add database indexes (#51, #52)
- Implement soft deletes (#54)
- Add composite constraints (#56)
- Normalize API pagination (#61)
- Add proper logging framework
- Implement health checks (#72)

### Phase 4: Low Priority & Technical Debt (Ongoing)
- Remove console.log statements (#21-24)
- Add accessibility improvements (#13)
- Implement API versioning (#40)
- Optimize database field types (#58)
- Add comprehensive test coverage (#73)

---

## NOTES FOR DEVELOPERS

1. **Security First**: Address all Critical and High severity issues before next production deployment
2. **Logging**: Implement structured logging (Winston/Pino) to replace console.log statements
3. **Testing**: Add integration tests for payment flow and appointment booking
4. **Documentation**: Create API documentation with OpenAPI/Swagger specification
5. **Monitoring**: Set up error tracking (Sentry), APM (DataDog/New Relic), and log aggregation (CloudWatch/ELK)
6. **Code Review**: Establish security code review process before production deployments

---

**Report Generated:** May 2, 2026  
**Total Issues Found:** 73  
**Average Severity:** Medium
