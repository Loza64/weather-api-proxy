import { Router } from 'express';
import { Container } from '../../composition-root';
import { buildLocationRouter, buildWeatherRouter } from '../../modules/weather/infrastructure/http/weather.routes';

export const buildApiRouter = (container: Container): Router => {
  const router = Router();

  router.use('/weather', buildWeatherRouter(container.weatherController));
  router.use('/locations', buildLocationRouter(container.weatherController));

  return router;
};
