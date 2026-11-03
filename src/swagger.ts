import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import { buildSwaggerDefinitions } from './shared/swagger/schemas';

const routesGlob = path
  .join(__dirname, 'modules', '**', 'infrastructure', 'http', '*.routes.{ts,js}')
  .replace(/\\/g, '/');

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      version: 'v1.0.0',
      title: 'Weather API Proxy',
      description:
        'API REST que consulta OpenWeatherMap y devuelve el clima actual y la búsqueda de ubicaciones con datos procesados y errores normalizados.',
    },
    servers: [{ url: '/' }],
    components: {
      schemas: buildSwaggerDefinitions(),
    },
  },
  apis: [routesGlob],
  failOnErrors: true,
};

export const swaggerSpec = swaggerJsdoc(options);
