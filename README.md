# ACSSZ EzClaim Web

## Overview
The public-facing EzClaim web app lets ACSSZ members submit reimbursements without paperwork. Built with Next.js and TypeScript, it streamlines claim entry, attachment uploads, and status tracking against the EzClaim API.

## Highlights
- Guided claim creation form with payout details, tag selection, and password-protected access
- Client-side photo upload flow using presigned URLs and immediate detail page handoff
- Localised UI with multi-language support for the ACSSZ community
- Responsive design ready for desktop or mobile submission flows

## Getting Started
```bash
pnpm install
pnpm dev
```
The app assumes the API at `http://localhost:8080`; override via `NEXT_PUBLIC_API_BASE_URL` in `.env.local` when needed.

## License
Licensed under the Do What The Fuck You Want To Public License (WTFPL). See [`LICENCE`](LICENCE).
