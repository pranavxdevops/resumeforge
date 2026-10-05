FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM dependencies AS build
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.28-alpine AS frontend
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/client /usr/share/nginx/html
EXPOSE 8080

FROM node:24-bookworm-slim AS backend
RUN apt-get update && apt-get install -y --no-install-recommends chromium ca-certificates fonts-liberation fonts-noto-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PORT=4000 CHROMIUM_PATH=/usr/bin/chromium
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist/server ./dist/server
COPY --from=build /app/shared/resume.css ./shared/resume.css
COPY --from=build /app/server/migrations ./server/migrations
COPY package*.json ./
RUN npm prune --omit=dev && mkdir -p /app/.data && chown -R node:node /app
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","dist/server/index.js"]
