FROM node:20-slim AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY server/package.json server/package.json

RUN npm install --omit=dev --ignore-scripts && \
    cd server && npm install --omit=dev

COPY server/ server/
COPY web/ web/
COPY scripts/ scripts/

RUN cd web && npm install && npm run build 2>/dev/null || true

ENV NODE_ENV=production
ENV PORT=3001

RUN mkdir -p /app/data /app/logs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

CMD ["node", "--import", "tsx/dist/loader.mjs", "server/src/index.ts"]
