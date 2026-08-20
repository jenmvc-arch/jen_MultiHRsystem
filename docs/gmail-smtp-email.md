# Gmail SMTP Email

## Server Configuration

Configure these variables only in the Node/Vercel server environment:

```env
GMAIL_USER="your-gmail-address@example.com"
GMAIL_APP_PASSWORD="your-16-character-google-app-password"
EMAIL_FROM_NAME="RedPoint HRMS"
```

For local development, place them in the untracked `.env.local` file. For production, add them in the Vercel project settings for the Preview and Production environments as appropriate. Do not use a `VITE_` prefix.

The SMTP transport is fixed to Gmail at `smtp.gmail.com`, port `465`, with TLS enabled. Use a Google App Password, not the normal Gmail account password.

Apply `supabase/migrations/20260820_gmail_email_security.sql` to the employee/Auth Supabase project. OTP and delivery tables are service-role-only and must never be queried directly by the browser.

## Routes

- `POST /api/employee-auth/otp/request`
- `POST /api/employee-auth/otp/resend`
- `POST /api/employee-auth/otp/verify`
- `POST /api/admin/email/test`
- `POST /api/admin/email/notification`

The test-email endpoint is restricted to the existing Super Admin/master-user account. Business notification endpoints require an authenticated admin session.

## OTP Policy

OTP values are six-digit cryptographically secure random values. Only SHA-256 hashes are stored. Codes expire after 10 minutes, can be resent once per 60 seconds, and are limited to five requests per email address per rolling hour. Verification is limited to five attempts and successful verification invalidates the challenge.
