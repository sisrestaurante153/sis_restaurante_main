FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
RUN npx prisma generate
RUN npm run build

FROM base AS ops
ENV NODE_ENV=production
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=deps --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --chown=nextjs:nextjs . .
RUN npx prisma generate
USER nextjs

FROM ops AS worker
USER root
RUN apk add --no-cache python3
USER nextjs

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "const raw=((process.env.NEXT_PUBLIC_BASE_PATH&&process.env.NEXT_PUBLIC_BASE_PATH.trim())||(() => { try { return new URL(process.env.APP_URL || 'http://localhost:3000').pathname; } catch { return ''; } })()); const base=!raw||raw==='/'?'':'/'+raw.replace(/^\\/+|\\/+$/g,''); const url='http://127.0.0.1:3000'+base+'/api/health'; require('node:http').get(url,(res)=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1));"]

CMD ["node", "server.js"]
