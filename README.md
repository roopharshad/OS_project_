# Dining Philosophers Problem – Semaphore-Based Synchronization

An interactive Operating Systems laboratory simulator built with React, Vite, Tailwind CSS, Framer Motion and Lucide icons.

## Run the website

```powershell
npm install
npm run dev        # development server, open the printed URL
npm run build      # production build into dist/
npm run preview    # serve the production build
```

If `npm install` hangs or reports `UNABLE_TO_VERIFY_LEAF_SIGNATURE` on this network, run it with the Windows certificate store:

```powershell
$env:NODE_OPTIONS="--use-system-ca"; npm install
```

## Project layout

| Path | Purpose |
| --- | --- |
| `src/engine/simulationEngine.js` | Pure JavaScript simulation of `take_forks`, `test`, `put_forks` with `mutex` and `S[i]`. One algorithm line runs per tick. |
| `src/hooks/useSimulation.js` | Connects the engine to React: start, pause, reset, step, speed, max rounds. |
| `src/components/` | Sidebar, dining table illustration, controls, semaphore monitor, log, status cards. |
| `src/sections/` | The seven page sections shown in the sidebar. |
| `c/dining_philosophers.c` | POSIX C implementation. The Source Code section displays this exact file. |
| `scripts/verify-engine.mjs` | Runs 800 headless simulations and checks safety and termination. |
| `scripts/browser-check.mjs` | Headless Chrome check of the controls, with screenshots. |

## Check the simulation engine

```powershell
node scripts/verify-engine.mjs
```

It fails if two neighbours ever eat together, two philosophers are in the critical section at once, a semaphore leaves 0..1, or a run fails to finish.

## Deployment (website + online Run Code)

Run Code needs a server with gcc, so a static host (Netlify, Vercel, GitHub Pages) is not enough. Deploy the included **Dockerfile**: it builds the site and runs `server/index.js`, which serves the pages and the C runner from one container with gcc installed.

**Render (free):**
1. Push this folder to a GitHub repository.
2. On render.com: **New → Blueprint**, pick the repository. `render.yaml` sets everything up.
3. Open the `https://…onrender.com` URL when the build finishes.

The same Dockerfile works on Railway, Fly.io, Koyeb, Google Cloud Run or any VPS:

```bash
docker build -t dining-philosophers .
docker run -p 8080:8080 dining-philosophers
```

Without Docker (Linux server with Node 18+ and gcc): `npm ci && npm run build && npm start`.

**Limits on Run Code** (change with environment variables, see `.env.example`):

| Setting | Default |
| --- | --- |
| Programs running at once (all visitors) | 3 |
| Runs per visitor IP per minute | 10 |
| Wall-clock time per run | 60 s |
| CPU time / memory per run (Linux) | 20 s / 512 MB |
| Source size / output size | 64 KB / 256 KB |

In the container, each program runs as an unprivileged user with those limits, a clean environment (no server secrets) and its own temp folder. This limits abuse but is not a full sandbox. A program can still open network connections. For a public, long-lived deployment, also block outbound network traffic for the container on your host, or set `C_RUNNER_PUBLIC=0` to switch Run Code off.

Free hosts sleep when idle, so the first visit after a break can take 30–60 seconds.

## Compile the C program (Linux or WSL)

```bash
gcc -Wall -Wextra -pthread c/dining_philosophers.c -o dining_philosophers
./dining_philosophers
```

MinGW on Windows has no `pthread.h`, so use Linux, WSL, or MSYS2 with `mingw-w64-winpthreads`.
