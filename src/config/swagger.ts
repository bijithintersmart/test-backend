import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { env } from './env';
import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry } from './openapi-registry';

// Import swagger definitions to register them to the registry
import '../modules/auth/auth.swagger';
import '../modules/health/health.swagger';

// Generate standard OpenAPI v3 document
const generator = new OpenApiGeneratorV3(registry.definitions);

const swaggerSpec = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'Enterprise Backend API Specs',
    version: '1.0.0',
    description: 'Production-ready Node.js + Express.js API documentation',
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}/api/v1`,
      description: 'V1 API Server',
    },
  ],
});

export const setupSwagger = (app: Express) => {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  app.get('/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  app.get('/api/v1/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};
