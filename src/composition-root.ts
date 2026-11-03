import { GetCurrentWeatherUseCase } from './modules/weather/application/get-current-weather.use-case';
import { SearchLocationsUseCase } from './modules/weather/application/search-locations.use-case';
import { WeatherProvider } from './modules/weather/domain/weather-provider';
import { WeatherController } from './modules/weather/infrastructure/http/weather.controller';
import { OpenWeatherClient } from './modules/weather/infrastructure/openweather/openweather.client';
import { OpenWeatherProvider } from './modules/weather/infrastructure/openweather/openweather.provider';
import { env } from './shared/config/env';

const buildOpenWeatherProvider = (): WeatherProvider =>
  new OpenWeatherProvider(
    new OpenWeatherClient({
      baseURL: env.OPENWEATHER_BASE_URL,
      apiKey: env.OPENWEATHER_API_KEY,
      timeoutMs: env.OPENWEATHER_TIMEOUT_MS,
    }),
  );

export const buildContainer = (weatherProvider: WeatherProvider = buildOpenWeatherProvider()) => {
  const weatherController = new WeatherController(
    new GetCurrentWeatherUseCase(weatherProvider),
    new SearchLocationsUseCase(weatherProvider),
  );

  return { weatherController };
};

export type Container = ReturnType<typeof buildContainer>;
