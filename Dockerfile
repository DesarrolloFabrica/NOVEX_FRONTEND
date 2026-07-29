# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Stage 1 — build (Vite)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY public ./public
COPY src ./src

# Variables Vite se inyectan en build-time (Cloud Build / docker build --build-arg).
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_API_BASE_URL=
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2 — nginx (SPA)
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh \
  && chmod +x /docker-entrypoint.sh

COPY --from=builder /app/dist /usr/share/nginx/html

# Cloud Run inyecta PORT; el entrypoint adapta nginx.
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
