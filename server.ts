import express from 'express';
import {
  handleAdminLogin,
  handleAdminLogout,
  handleAdminProfile,
  handleAdminSession,
  handleEmployeeAuthProfile,
  handleEmployeeAuthSetup,
  handleEmployeeOtpRequest,
  handleEmployeeOtpResend,
  handleEmployeeOtpVerify,
  handleEmployeeAccountAction,
  handleEmployeeAccountEvents,
  handleEmployeeAccountList,
  handleAdminEmailTest,
  handleBusinessEmailNotification,
  handleGoogleSheetsLogin,
} from './api/_lib/employeeAccountHandlers';
import {
  handleAdminEmployeeRequests,
  handleAdminEmployeeRequestUpdate,
  handleAdminProfileChangeUpdate,
  handleEmployeePortalBootstrap,
  handleEmployeePortalMessage,
  handleEmployeePortalNotificationRead,
  handleEmployeePortalProfile,
  handleEmployeePortalProfileChange,
  handleEmployeePortalRequest,
  handleEmployeePortalLeaveRequests,
  handleEmployeePortalLeaveWorkspace,
  handleEmployeePortalReopen,
  handleAdminNotificationOutbox,
} from './api/_lib/employeeServiceHandlers';
import { handleExport } from './api/_lib/exportHandlers';
import { handleGoogleSheetsProxy } from './api/_lib/googleSheetsServer';
import handleGeneratePdf from './api/generate-pdf';
import adminDataHandler from './api/admin/data';
import adminBootstrapHandler from './api/admin/bootstrap';
import adminDocumentsHandler from './api/admin/documents';
import adminLeaveWorkspaceHandler from './api/admin/leave-workspace';
import adminPayrollPublishHandler from './api/admin/payroll/publish';
import adminPayrollEmailHandler from './api/admin/payroll/email';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Secure admin session and employee-account management routes.
app.post('/api/auth/admin-login', handleAdminLogin);
app.post('/api/auth/google-login', handleGoogleSheetsLogin);
app.post('/api/auth/logout', handleAdminLogout);
app.get('/api/auth/session', handleAdminSession);
app.post('/api/auth/profile', handleAdminProfile);
app.get('/api/employee-auth/profile', handleEmployeeAuthProfile);
app.post('/api/employee-auth/complete-setup', handleEmployeeAuthSetup);
app.post('/api/employee-auth/otp/request', handleEmployeeOtpRequest);
app.post('/api/employee-auth/otp/resend', handleEmployeeOtpResend);
app.post('/api/employee-auth/otp/verify', handleEmployeeOtpVerify);
app.get('/api/admin/employee-accounts', handleEmployeeAccountList);
app.get('/api/admin/employee-accounts/events', handleEmployeeAccountEvents);
app.post('/api/admin/employee-accounts/provision', (req, res) => (
  handleEmployeeAccountAction(req, res, 'provision')
));
app.post('/api/admin/employee-accounts/reset-password', (req, res) => (
  handleEmployeeAccountAction(req, res, 'reset_password')
));
app.post('/api/admin/employee-accounts/share', (req, res) => (
  handleEmployeeAccountAction(req, res, 'share')
));
app.post('/api/admin/exports', handleExport);
app.post('/api/admin/email/test', handleAdminEmailTest);
app.post('/api/admin/email/notification', handleBusinessEmailNotification);
app.get('/api/employee-portal/bootstrap', handleEmployeePortalBootstrap);
app.patch('/api/employee-portal/profile', handleEmployeePortalProfile);
app.post('/api/employee-portal/requests', handleEmployeePortalRequest);
app.get('/api/employee-portal/leave-requests', handleEmployeePortalLeaveRequests);
app.post('/api/employee-portal/leave-requests', handleEmployeePortalLeaveRequests);
app.get('/api/employee-portal/leave-workspace', handleEmployeePortalLeaveWorkspace);
app.post('/api/employee-portal/request-message', handleEmployeePortalMessage);
app.post('/api/employee-portal/reopen-request', handleEmployeePortalReopen);
app.post('/api/employee-portal/profile-change-requests', handleEmployeePortalProfileChange);
app.post('/api/employee-portal/notifications/read', handleEmployeePortalNotificationRead);
app.get('/api/admin/employee-requests', handleAdminEmployeeRequests);
app.post('/api/admin/employee-requests/update', handleAdminEmployeeRequestUpdate);
app.post('/api/admin/profile-change-requests/update', handleAdminProfileChangeUpdate);
app.post('/api/admin/notifications/outbox/process', handleAdminNotificationOutbox);
app.get('/api/admin/bootstrap', adminBootstrapHandler);
app.post('/api/admin/data', adminDataHandler);
app.post('/api/admin/documents', adminDocumentsHandler);
app.get('/api/admin/leave-workspace', adminLeaveWorkspaceHandler);
app.post('/api/admin/leave-workspace', adminLeaveWorkspaceHandler);
app.post('/api/admin/payroll/publish', adminPayrollPublishHandler);
app.post('/api/admin/payroll/email', adminPayrollEmailHandler);
app.post('/api/google-sheets', handleGoogleSheetsProxy);

app.get('/api/generate-pdf', handleGeneratePdf);

app.listen(PORT, () => {
  console.log(`[PDF Backend] Server is running on http://localhost:${PORT}`);
});
