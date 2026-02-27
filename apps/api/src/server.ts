import 'dotenv/config';
import Fastify from 'fastify';
import { setDefaultDatabaseUrl, createPrismaClient, pushPrismaSchema } from './infrastructure/db.js';
import { registerLawyers } from './routes/lawyers.js';
import { registerAppointments } from './routes/appointments.js';

setDefaultDatabaseUrl();

const app = Fastify({ logger: true });
const prisma = createPrismaClient();

registerLawyers(app, prisma);
registerAppointments(app, prisma);

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

await pushPrismaSchema(app);
await app.listen({ port, host });
