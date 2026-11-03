import { CurrentWeather } from '../../domain/current-weather';
import { Location } from '../../domain/location';
import { UnitSystem, unitLabels } from '../../domain/units';
import { invalidResponse } from './provider-error';

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toText = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);

const toDate = (seconds: unknown): Date | null => {
  const value = toNumber(seconds);
  return value === null ? null : new Date(value * 1000);
};

const section = (value: unknown): JsonObject => (isObject(value) ? value : {});

export const toLocations = (payload: unknown): Location[] => {
  if (!Array.isArray(payload)) throw invalidResponse();

  return payload.flatMap((item): Location[] => {
    if (!isObject(item)) return [];

    const latitude = toNumber(item.lat);
    const longitude = toNumber(item.lon);
    if (latitude === null || longitude === null) return [];

    return [
      {
        name: toText(item.name),
        state: toText(item.state),
        country: toText(item.country),
        latitude,
        longitude,
      },
    ];
  });
};

export const toCurrentWeather = (payload: unknown, units: UnitSystem): CurrentWeather => {
  if (!isObject(payload)) throw invalidResponse();

  const coord = section(payload.coord);
  const latitude = toNumber(coord.lat);
  const longitude = toNumber(coord.lon);

  const condition = Array.isArray(payload.weather) ? payload.weather[0] : undefined;
  const conditionId = isObject(condition) ? toNumber(condition.id) : null;
  const group = isObject(condition) ? toText(condition.main) : null;
  const description = isObject(condition) ? toText(condition.description) : null;
  const icon = isObject(condition) ? toText(condition.icon) : null;

  const main = section(payload.main);
  const temperature = toNumber(main.temp);
  const observedAt = toDate(payload.dt);

  if (
    latitude === null ||
    longitude === null ||
    conditionId === null ||
    group === null ||
    description === null ||
    icon === null ||
    temperature === null ||
    observedAt === null
  ) {
    throw invalidResponse();
  }

  const wind = section(payload.wind);
  const sys = section(payload.sys);

  const weather = new CurrentWeather();
  weather.location = { name: toText(payload.name), state: null, country: toText(sys.country), latitude, longitude };
  weather.observedAt = observedAt;
  weather.condition = { id: conditionId, group, description, icon };
  weather.temperature = temperature;
  weather.feelsLike = toNumber(main.feels_like);
  weather.temperatureMin = toNumber(main.temp_min);
  weather.temperatureMax = toNumber(main.temp_max);
  weather.humidity = toNumber(main.humidity);
  weather.pressure = toNumber(main.pressure);
  weather.visibility = toNumber(payload.visibility);
  weather.cloudiness = toNumber(section(payload.clouds).all);
  weather.windSpeed = toNumber(wind.speed);
  weather.windDirection = toNumber(wind.deg);
  weather.windGust = toNumber(wind.gust);
  weather.rainLastHour = toNumber(section(payload.rain)['1h']);
  weather.snowLastHour = toNumber(section(payload.snow)['1h']);
  weather.sunrise = toDate(sys.sunrise);
  weather.sunset = toDate(sys.sunset);
  weather.timezoneOffsetSeconds = toNumber(payload.timezone);
  weather.units = unitLabels(units);

  return weather;
};
