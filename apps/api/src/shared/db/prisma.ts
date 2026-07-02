import { PrismaPg } from '@prisma/adapter-pg';

import { config } from '../config/env.js';
import { PrismaClient } from '../../generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: config.DATABASE_URL });

// Singleton: the only place Prisma is touched outside repositories.
export const prisma = new PrismaClient({ adapter });
