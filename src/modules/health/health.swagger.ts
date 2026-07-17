import { registry } from '../../config/openapi-registry';
import { z } from 'zod';

// Define the response schemas
const MemoryStatsSchema = registry.register(
  'MemoryStats',
  z.object({
    rss: z.string().openapi({ example: '85 MB' }),
    heapTotal: z.string().openapi({ example: '45 MB' }),
    heapUsed: z.string().openapi({ example: '30 MB' }),
  })
);

const HealthResponseSchema = registry.register(
  'HealthResponse',
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'System health check successful' }),
    data: z.object({
      uptime: z.number().openapi({ example: 124.5 }),
      memory: MemoryStatsSchema,
    }),
  })
);

const LiveResponseSchema = registry.register(
  'LiveResponse',
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Process is alive' }),
  })
);

const ReadyResponseSchema = registry.register(
  'ReadyResponse',
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Database and Redis are connected' }),
  })
);

// Register Paths
registry.registerPath({
  method: 'get',
  path: '/health',
  summary: 'Retrieve general system health and memory statistics',
  tags: ['Health'],
  responses: {
    200: {
      description: 'System health details retrieved successfully',
      content: {
        'application/json': {
          schema: HealthResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/health/live',
  summary: 'Liveness check for monitoring process activity',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Process is active and running',
      content: {
        'application/json': {
          schema: LiveResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/health/ready',
  summary: 'Readiness check to verify database and Redis connectivity',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Services are ready to accept traffic',
      content: {
        'application/json': {
          schema: ReadyResponseSchema,
        },
      },
    },
  },
});
