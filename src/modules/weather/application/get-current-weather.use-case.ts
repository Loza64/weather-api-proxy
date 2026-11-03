import { AppError } from '../../../shared/errors/AppError';
import { CurrentWeather } from '../domain/current-weather';
import { UnitSystem } from '../domain/units';
import { WeatherProvider } from '../domain/weather-provider';

export interface CurrentWeatherRequest {
  city?: string;
  country?: string;
  lat?: number;
  lon?: number;
  units: UnitSystem;
  lang: string;
}

export class GetCurrentWeatherUseCase {
  constructor(private readonly weatherProvider: WeatherProvider) {}

  async execute(request: CurrentWeatherRequest): Promise<CurrentWeather> {
    const { city, country, lat, lon, units, lang } = request;
    const hasCoordinates = lat !== undefined || lon !== undefined;

    if (city !== undefined && hasCoordinates) {
      throw new AppError('Usa city o lat y lon, no ambos', 400);
    }
    if (city === undefined && !hasCoordinates) {
      throw new AppError('Debes enviar city o lat y lon', 400);
    }
    if (hasCoordinates && (lat === undefined || lon === undefined)) {
      throw new AppError('lat y lon deben enviarse juntos', 400);
    }
    if (country !== undefined && city === undefined) {
      throw new AppError('country solo puede usarse junto con city', 400);
    }

    if (city !== undefined) {
      const query = country ? `${city},${country}` : city;
      const [location] = await this.weatherProvider.searchLocations(query, 1);
      if (!location) {
        throw new AppError(`No se encontró la ubicación "${query}"`, 404);
      }

      const weather = await this.weatherProvider.getCurrentWeather(location, { units, lang });
      weather.location = location;
      return weather;
    }

    return this.weatherProvider.getCurrentWeather({ latitude: lat as number, longitude: lon as number }, { units, lang });
  }
}
