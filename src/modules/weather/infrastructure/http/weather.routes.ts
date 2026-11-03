import { Router } from 'express';
import { validateQuery } from '../../../../shared/middlewares/validate-query.middleware';
import { CurrentWeatherQueryDto } from '../../application/current-weather-query.dto';
import { LocationSearchQueryDto } from '../../application/location-search-query.dto';
import { WeatherController } from './weather.controller';

export const buildWeatherRouter = (controller: WeatherController): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/weather/current:
   *   get:
   *     summary: Clima actual de una ciudad o de unas coordenadas
   *     description: Envía city (con country opcional) o lat y lon. Con city, la ubicación se resuelve primero con la búsqueda de ubicaciones del proveedor.
   *     tags: [Weather]
   *     parameters:
   *       - in: query
   *         name: city
   *         description: Nombre de la ciudad
   *         schema: { type: string, example: San Salvador }
   *       - in: query
   *         name: country
   *         description: Código ISO 3166 de 2 letras; solo junto con city
   *         schema: { type: string, example: SV }
   *       - in: query
   *         name: lat
   *         description: Latitud (-90 a 90); se envía junto con lon
   *         schema: { type: number, example: 13.6989 }
   *       - in: query
   *         name: lon
   *         description: Longitud (-180 a 180); se envía junto con lat
   *         schema: { type: number, example: -89.1914 }
   *       - in: query
   *         name: units
   *         description: metric (°C, m/s), imperial (°F, mph) o standard (K, m/s)
   *         schema: { type: string, enum: [metric, imperial, standard], default: metric }
   *       - in: query
   *         name: lang
   *         description: Idioma de las descripciones (código del proveedor, por ejemplo es, en, fr, pt_br)
   *         schema: { type: string, default: en }
   *     responses:
   *       200:
   *         description: Clima actual procesado
   *       400:
   *         description: Parámetros inválidos o combinación incorrecta de city y lat/lon
   *       404:
   *         description: Ubicación no encontrada
   *       429:
   *         description: Se alcanzó el límite de consultas del proveedor
   *       502:
   *         description: El proveedor falló, no respondió o devolvió datos inválidos
   *       504:
   *         description: El proveedor tardó demasiado en responder
   */
  router.get('/current', validateQuery(CurrentWeatherQueryDto), controller.current);

  return router;
};

export const buildLocationRouter = (controller: WeatherController): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/locations/search:
   *   get:
   *     summary: Busca ubicaciones por nombre
   *     description: Devuelve hasta 5 coincidencias con sus coordenadas, útiles para elegir la ubicación correcta antes de consultar el clima.
   *     tags: [Locations]
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         description: Ciudad, opcionalmente con estado (solo EE. UU.) y país separados por coma
   *         schema: { type: string, example: 'Santa Ana,SV' }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, minimum: 1, maximum: 5, default: 5 }
   *     responses:
   *       200:
   *         description: Lista de ubicaciones; vacía si no hay coincidencias
   *       400:
   *         description: Parámetros inválidos
   *       429:
   *         description: Se alcanzó el límite de consultas del proveedor
   *       502:
   *         description: El proveedor falló, no respondió o devolvió datos inválidos
   *       504:
   *         description: El proveedor tardó demasiado en responder
   */
  router.get('/search', validateQuery(LocationSearchQueryDto), controller.searchLocations);

  return router;
};
