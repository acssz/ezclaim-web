FROM node:20-slim AS base
ARG NEXT_PUBLIC_API_BASE_URL
ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL}"
RUN corepack enable
WORKDIR /app

FROM base AS deps
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
# Create non-root user for runtime
RUN useradd --create-home --uid 1001 nextjs
USER nextjs
COPY --chown=nextjs:nextjs --from=build /app/public ./public
COPY --chown=nextjs:nextjs --from=build /app/.next/static ./.next/static
COPY --chown=nextjs:nextjs --from=build /app/.next/standalone ./
COPY --chown=nextjs:nextjs --from=build /app/package.json ./package.json

EXPOSE 3000
CMD ["node", "server.js"]
