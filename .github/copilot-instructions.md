# Copilot Instructions for ft_transcendence

## Architecture Overview
- **Monorepo**: Contains `frontend/` (TypeScript/JS), `backend/` (Node.js/Express), `elk/` (monitoring), `nginx/` (proxy), and `monitoring/` (Grafana/Prometheus).
- **Frontend**: Legacy JS game in `frontend/pong/`, new features in TypeScript under `frontend/src/`. TypeScript compiles to `dist/`.
- **Backend**: Express app with routes in `backend/routes/`, main entry in `backend/app.js`. Uses SQLite (see `backend/database.js`).
- **Monitoring**: ELK stack and Prometheus/Grafana, configured via `elk/` and `monitoring/`.
- **Reverse Proxy**: Nginx config in `nginx/`.

## Developer Workflows
- **Build Frontend**: `npm run build` in `frontend/` compiles TypeScript.
- **Dev Frontend**: `npm run dev` for auto-recompile/watch.
- **Serve Pong Only**: `make serve-pong` (serves legacy JS game).
- **Full Dev Environment**: `make dev` (Docker Compose, all services).
- **Production**: `make prod` (Docker Compose, prod config).
- **Logs**: `make logs` or `make logs-prod` for real-time logs.
- **Reset DB**: `make reset-db` to drop and recreate database.

## Patterns & Conventions
- **Frontend**: Use TypeScript for new code (`src/`), keep legacy JS in `pong/`. UI language selector: static HTML buttons preferred, handlers in `lang.js`.
- **Backend**: Routes are modular (`routes/`), session-based auth, language preference persisted in session and DB.
- **Monitoring**: ELK and Prometheus/Grafana are configured via shell scripts and YAML in their respective folders.
- **Docker**: Compose files for dev/prod (`docker-compose.dev.yml`, `docker-compose.prod.yml`).
- **Makefile**: Centralizes all major workflows; use `make help` for command list.

## Integration Points
- **Frontend/Backend**: Communicate via REST endpoints (e.g., `/api/i18n/set-language`).
- **Monitoring**: Backend logs and metrics are shipped to ELK/Prometheus via Docker setup.
- **Nginx**: Acts as reverse proxy for frontend/backend, SSL via `nginx/ssl/`.

## Examples
- **Add a new backend route**: Create file in `backend/routes/`, import and mount in `backend/app.js`.
- **Add a new frontend feature**: Write in `frontend/src/`, update `tsconfig.json` if needed, run `npm run build`.
- **Update language selector**: Edit static HTML in `frontend/pong/index.html`, attach JS handlers in `frontend/pong/lang.js`.

## Tips
- Always use Makefile commands for starting/stopping services.
- For language features, prefer static HTML for selectors and attach JS listeners.
- Check `README.md` in each major folder for specific instructions.

---

If any section is unclear or missing, please ask for clarification or request an update.
