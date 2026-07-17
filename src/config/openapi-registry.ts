import { z } from 'zod';
import { extendZodWithOpenApi, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

// 1. Extend Zod to support the .openapi() extension method
extendZodWithOpenApi(z);

// 2. Initialize the master OpenAPI registry
export const registry = new OpenAPIRegistry();

// 3. Register Global Security Schemes
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});
