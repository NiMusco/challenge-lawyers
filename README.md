# ⚖️ Lawyers Challenge

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Fastify](https://img.shields.io/badge/fastify-%23000000.svg?style=for-the-badge&logo=fastify&logoColor=white)
![Prisma](https://img.shields.io/badge/prisma-%232D3748.svg?style=for-the-badge&logo=prisma&logoColor=white)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)

This project is a small but thought-through **lawyers appointment system**.

<img width="1858" height="1102" alt="image" src="https://github.com/user-attachments/assets/935c2dc2-7c51-43bd-bc98-270dc3afdb46" />

---

## :electric_plug: Installation

This project uses a monorepo structure with Yarn workspaces.

1. **Pre‑requisites**: Node.js 20+ and Yarn.
2. Run `yarn` in the repo root to install dependencies.
3. Run `yarn dev` to start both API and web apps.

By default:

- **API** will be available at `http://127.0.0.1:3000`
- **Web** will be available at `http://127.0.0.1:5173`  
  (if the port is taken, Vite will pick another one)

The local database is created automatically as **SQLite** at `./.data/dev.db`.  
You don’t need to configure environment variables to run the demo.

---

## 🧐 Features

- **Time‑zone–aware scheduling**
  - Appointments are stored in **UTC** in the database.
  - The browser’s IANA time zone is detected automatically (fallback to `UTC`).
  - All times are shown in the **user’s local time**.

- **Smart calendar UX**
  - Full‑screen weekly calendar using FullCalendar.
  - Clickable time slots with hover feedback (only on free slots).
  - Existing appointments are clickable and open a detail dialog.
  - Overlap detection prevents creating appointments in an occupied slot.

- **Clean separation of concerns**
  - `apps/api`: Fastify API (Prisma + DB + business rules).
  - `apps/web`: React + Vite SPA for the lawyers UI.
  - `packages/db`: Prisma schema & database utilities.

- **Robust error handling**
  - Centralized `ApiError` wrapper in the web app.
  - Clear feedback when time slots are invalid or overlapping.

- **Modern stack**
  - TypeScript everywhere (API + web + shared types).
  - Prisma ORM with a normalized schema.
  - Tailwind‑based UI with small components.

---

## 🗄️ Database & Prisma

The default local setup uses SQLite at `./.data/dev.db`.

```bash
yarn workspace @challenge/db db:generate
```

This also generates an **ERD diagram**:

![Database schema ERD](packages/db/prisma/erd.svg)

---

## ✅ Tests

```bash
yarn test
```

To run the tests with coverage:

```bash
yarn test:coverage
```

This will generate a coverage report under `apps/api/coverage` (statements/lines ≥ 90%).

---

## 📚 API & Web Overview

Main API routes used by the web app:

- `POST /api/bootstrap` – creates minimal demo data (lawyer, calendar, etc.)
- `GET /api/lawyers` – lists available lawyers and their calendars
- `GET /api/appointments` – lists appointments for a given lawyer
- `POST /api/appointments` – creates a new appointment (UTC‑backed, time‑zone–aware)

---

## 🚀 Docker Compose

If you have Docker installed (optional):

```bash
docker compose up --build
```

This will expose:

- **Web** at `http://127.0.0.1:8080`
- **API** at `http://127.0.0.1:3000`

The API runs with `AUTO_DB_PUSH=1` in Compose so that Prisma applies the schema automatically for demo purposes.

---

👋 That's it!  
