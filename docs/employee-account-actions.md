# Employee Account Actions

## Production setup

Apply these migrations to the appropriate Supabase projects:

- `supabase/migrations/20260811_employee_account_actions.sql` to the employee portal/Auth project.
- `supabase/migrations/20260811_secure_admin_password_storage.sql` to the primary HRMS project.

Configure the server environment from `.env.example`. The employee service-role key, `ADMIN_SESSION_SECRET`, Resend key, and Twilio credentials must never use a `VITE_` prefix.

The server exposes:

- `POST /api/auth/admin-login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/admin/employee-accounts`
- `GET /api/admin/employee-accounts/events`
- `POST /api/admin/employee-accounts/provision`
- `POST /api/admin/employee-accounts/share`
- `POST /api/admin/employee-accounts/reset-password`
- `GET /api/employee-auth/profile`
- `POST /api/employee-auth/complete-setup`

Only the signed `hr.redpoint` admin session may call employee-account mutation or history endpoints. Passwords and one-time links are not returned by those APIs.

## Local preview

Start the frontend and API servers, then open:

`http://localhost:3000/employee-directory?accountPreview=1`

Preview actions persist under `preview_employee_account_actions` in localStorage. Email and WhatsApp actions generate copyable `mailto:` and `wa.me` handoff links without calling external providers.
