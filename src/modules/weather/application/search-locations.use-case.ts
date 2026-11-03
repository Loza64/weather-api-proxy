import { Location } from '../domain/location';
import { WeatherProvider } from '../domain/weather-provider';

export class SearchLocationsUseCase {
  constructor(private readonly weatherProvider: WeatherProvider) {}

  execute(query: string, limit: number): Promise<Location[]> {
    return this.weatherProvider.searchLocations(query, limit);
  }
}
