# ---- Stage 1: Build the React client ----
FROM node:22-alpine AS client-builder
WORKDIR /app/client

# Install dependencies first (layer caching)
COPY client/package*.json ./
RUN npm ci

# Copy source and build
COPY client/ ./
RUN npm run build

# ---- Stage 2: Install server production dependencies ----
FROM node:22-alpine AS server-builder
WORKDIR /app/server

COPY server/package*.json ./
# native module prebuilds are fetched at install time for musl (alpine)
RUN npm ci --omit=dev

# Copy the server source into the builder stage
COPY server/ ./

# ---- Stage 3: Runtime image (minimal) ----
FROM node:22-alpine
ENV NODE_ENV=production
ENV PORT=3000
ENV KANBATE_DATA_DIR=/data

WORKDIR /app

# Non-root user for security
RUN addgroup -S kanbate && adduser -S kanbate -G kanbate \
  && mkdir -p /data /app/server && chown -R kanbate:kanbate /app /data
USER kanbate

# Server app + production deps
COPY --from=server-builder --chown=kanbate:kanbate /app/server /app/server

# Built client (served statically by Express)
COPY --from=client-builder --chown=kanbate:kanbate /app/client/dist /app/client/dist

# Dedicated data volume for SQLite persistence
VOLUME ["/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

WORKDIR /app/server
CMD ["node", "index.js"]
