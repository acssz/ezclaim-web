EzClaim Web – Next.js + TypeScript frontend for EzClaim API.

## Quick Start

Prerequisites:

- Node.js 18+
- EzClaim API running locally at `http://localhost:8080` (default)

Install deps and start dev server:

```bash
pnpm install
pnpm dev
# open http://localhost:3000
```

Configure API base URL via env (optional):

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

## Features (Anonymous)

- Create a claim with amount, currency, time, payout info, optional recipient/description/password.
- Select public tags (fetched from `/api/tags`).
- Upload receipt photos via presigned PUT, then create photo records.
- After creation, redirect to claim detail page and persist password locally for auto access.
- View claim details, tags, photos; fetch presigned download URLs for previews.
- Attempt status update (e.g., Withdraw/Resubmit) with password if allowed by server.

## Notes

- Photo presign and download endpoints return generic objects. The UI expects `url` (and optional `headers` for upload) which aligns with common implementations.
- Anonymous PATCH permissions depend on server rules. Errors are surfaced to the user if not allowed.
