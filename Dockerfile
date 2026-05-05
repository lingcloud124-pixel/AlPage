FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json

RUN npm install && cd server && npm install && cd ../web && npm install

COPY server/ server/
COPY web/ web/
COPY scripts/ scripts/
COPY theme_builder.py ./theme_builder.py
COPY config/ config/
COPY assets/ assets/

RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip \
  && rm -rf /var/lib/apt/lists/* \
  && python3 -m pip install --no-cache-dir pillow

COPY package.json package-lock.json* ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json

RUN npm install --omit=dev \
  && cd server && npm install --omit=dev \
  && cd ../web && npm install \
  && npx playwright install --with-deps chromium

COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/admin server/admin
COPY --from=build /app/web/dist web/dist
COPY --from=build /app/web/scripts web/scripts
COPY --from=build /app/scripts scripts
COPY --from=build /app/theme_builder.py ./theme_builder.py
COPY --from=build /app/config config
COPY --from=build /app/assets assets

ENV NODE_ENV=production
ENV PORT=3001

RUN mkdir -p /app/data /app/logs /app/output/service-jobs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '3001') + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/dist/index.js"]
