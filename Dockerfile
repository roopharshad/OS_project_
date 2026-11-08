# Dining Philosophers – website + online C runner in one container.
#   docker build -t dining-philosophers .
#   docker run -p 8080:8080 dining-philosophers

# ── 1. Build the website ─────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ── 2. Runtime: Node + gcc, no npm packages needed ───────────────────────────
FROM node:20-bookworm-slim
# gcc + libc headers for pthread.h / semaphore.h.
# prlimit (util-linux) and stdbuf (coreutils) are already in the base image.
RUN apt-get update \
 && apt-get install -y --no-install-recommends gcc libc6-dev \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 10001 runner \
 && useradd --system --uid 10001 --gid runner --no-create-home --shell /usr/sbin/nologin runner

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server ./server
COPY c ./c
COPY package.json ./

ENV NODE_ENV=production \
    PORT=8080 \
    C_RUNNER_UID=10001 \
    C_RUNNER_GID=10001 \
    C_RUNNER_MAX_CONCURRENT=3 \
    C_RUNNER_RUNS_PER_MINUTE=10 \
    C_RUNNER_RUN_TIMEOUT_SEC=60

# The server starts as root only so it can launch visitors' programs as the
# unprivileged "runner" user (C_RUNNER_UID). Programs cannot write to /app,
# read the server's environment, or signal the server process.
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.js"]
