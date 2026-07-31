# Onboarding Handbook PDF Template

The production handbook is not stored in the repository. Register it in the private
`handbook-templates` Supabase Storage bucket after the signing migration is applied.

## Placement manifest

Create a JSON file with one placement for Parts 1 through 14 and one final signature
placement for Part 15. Coordinates are PDF points measured from the top-left corner.
`page` is one-based.

```json
{
  "schemaVersion": 1,
  "templateVersion": "redpoint-handbook-2026.1",
  "pageCount": 99,
  "placements": [
    {
      "partNumber": 1,
      "kind": "initial",
      "page": 7,
      "x": 500,
      "y": 760,
      "width": 42,
      "height": 22,
      "date": { "x": 500, "y": 788, "fontSize": 8 }
    }
  ]
}
```

The example placement is illustrative only. The registration command rejects a
manifest unless it contains exactly 15 valid placements and its page count matches
the supplied PDF.

## Registration

```bash
npm run onboarding:register-template -- \
  --pdf "/absolute/path/Employee Handbook.pdf" \
  --manifest "/absolute/path/handbook-placement.json" \
  --entity "ENT-92"
```

Template versions are immutable. Any PDF or coordinate change requires a new
`templateVersion`.

## Production checklist

1. Apply `supabase/migrations/20260731_onboarding_handbook_signing.sql`.
2. Enable email magic-link authentication in Supabase Auth.
3. Provision each signer in Supabase Auth using the same email stored in `employees`
   or `candidates`.
4. Keep the same email on the employee's existing HR login account so the current login
   can initiate the secure magic-link step.
5. Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and the server-only
   `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
6. Render the registered PDF with test marks and visually verify every placement before
   activating the template.

Do not place `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_` variable or client-side code.
