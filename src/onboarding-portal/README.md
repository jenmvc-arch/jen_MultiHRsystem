# Onboarding Portal Source

This feature was adapted from:

- Repository: `https://github.com/meijernlaw-cell/RedP-Onboarding-Portal.git`
- Imported commit: `939344f851dce1dd827ddaaba8f86ecc670e7a87`

The standalone login and outer navigation shell were intentionally omitted. The portal
now runs inside the Red Point HRMS Hire & Onboarding section and reuses the HRMS
employees and candidates. Employee signing additionally requires a matching Supabase
Auth session; HR administrators can preview the portal but cannot sign for an employee.

Duplicate standalone dashboard, document-upload, and HR analytics views were removed.
Recruitment administration remains in the parent Hire & Onboarding workflow; this portal
contains only the employee journey, handbook, compliance quiz, and completion record.

## Section video integration

Each handbook section has its own video slot. Configure a shared media directory with
`VITE_HANDBOOK_VIDEO_BASE_URL` and the portal will resolve paths such as
`part-01-section-01.mp4` for section-level playback. When a section-specific file is not
available, the UI can fall back to the matching Part-level source. A specific Part can
override the shared path with `VITE_HANDBOOK_VIDEO_PART_1` through
`VITE_HANDBOOK_VIDEO_PART_15`, and a specific section can override with keys such as
`VITE_HANDBOOK_VIDEO_PART_1_SECTION_1`. Direct MP4 URLs use the native video player;
YouTube and Vimeo URLs are rendered as embedded players.

## Signed handbook archive

The visible handbook workflow is unchanged. Parts 1 through 14 save cropped initial
images and server timestamps to a private signing session. Part 15 saves the final
signature. Refreshing or changing devices restores those marks from Supabase.

Finalization is handled by `POST /api/onboarding/finalize-handbook`. The endpoint verifies
the Supabase Auth user, subject record, quiz result, 15 signature marks, immutable
template version, page count, and template SHA-256 before overlaying marks with
`pdf-lib`. It stores the completed PDF in the private `signed-handbooks` bucket and
returns a five-minute signed download URL.

Apply `supabase/migrations/20260731_onboarding_handbook_signing.sql` before enabling the
feature. Configure `SUPABASE_SERVICE_ROLE_KEY` only in the Vercel server environment.
Each employee or candidate signer must exist in Supabase Auth and in the corresponding
HR table with the same email address. Employee login sends a Supabase magic link and
restores the HR session after that link is opened.

See `docs/onboarding-handbook-template.md` for original PDF registration and placement
manifest instructions.
