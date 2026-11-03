import { CurrentWeather } from './current-weather';
import { Coordinates, Location } from './location';
import { UnitSystem } from './units';

export interface CurrentWeatherOptions {
  units: UnitSystem;
  lang: string;
}

export interface WeatherProvider {
  searchLocations(query: string, limit: number): Promise<Location[]>;
  getCurrentWeather(coordinates: Coordinates, options: CurrentWeatherOptions): Promise<CurrentWeather>;
}
