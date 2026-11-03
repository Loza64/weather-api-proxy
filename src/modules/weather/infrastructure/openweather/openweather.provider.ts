import { CurrentWeather } from '../../domain/current-weather';
import { Coordinates, Location } from '../../domain/location';
import { CurrentWeatherOptions, WeatherProvider } from '../../domain/weather-provider';
import { OpenWeatherClient } from './openweather.client';
import { toCurrentWeather, toLocations } from './openweather.mapper';

export class OpenWeatherProvider implements WeatherProvider {
  constructor(private readonly client: OpenWeatherClient) {}

  async searchLocations(query: string, limit: number): Promise<Location[]> {
    const payload = await this.client.get('/geo/1.0/direct', { q: query, limit });
    return toLocations(payload);
  }

  async getCurrentWeather(
    { latitude, longitude }: Coordinates,
    { units, lang }: CurrentWeatherOptions,
  ): Promise<CurrentWeather> {
    const payload = await this.client.get('/data/2.5/weather', { lat: latitude, lon: longitude, units, lang });
    return toCurrentWeather(payload, units);
  }
}
