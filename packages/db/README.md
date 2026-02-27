## `@challenge/db`

### Requisitos

- PostgreSQL
- Variable de entorno `DATABASE_URL` (ver `.env.example` en la raíz)

### Comandos útiles

```bash
# Generar Prisma Client
yarn workspace @challenge/db db:generate

# Crear/ejecutar migraciones en dev
yarn workspace @challenge/db db:migrate:dev

# Empujar schema (sin migración) - útil para prototipos
yarn workspace @challenge/db db:push
```

### Notas de modelado (timezones)

- `startsAtUtc` / `endsAtUtc` son la fuente de verdad.
- `scheduledTimeZoneId` + `scheduledOffsetMinutes` preservan el contexto del scheduling (DST-safe).

