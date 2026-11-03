import { Location } from './location';
import { UnitLabels } from './units';

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export const compassPoint = (degrees: number): string => {
  const normalized = ((degrees % 360) + 360) % 360;
  return COMPASS[Math.round(normalized / 22.5) % 16];
};

const round1 = (value: number): number => Math.round(value * 10) / 10;
const roundOrNull = (value: number | null): number | null => (value === null ? null : round1(value));

const pad = (value: number): string => String(value).padStart(2, '0');

export const toLocalIso = (at: Date, offsetSeconds: number): string => {
  const shifted = new Date(at.getTime() + offsetSeconds * 1000).toISOString().slice(0, 19);
  const sign = offsetSeconds < 0 ? '-' : '+';
  const abs = Math.abs(offsetSeconds);
  return `${shifted}${sign}${pad(Math.floor(abs / 3600))}:${pad(Math.floor((abs % 3600) / 60))}`;
};

export interface Condition {
  id: number;
  group: string;
  description: string;
  icon: string;
}

export interface PublicCurrentWeather {
  location: Location;
  observedAt: string;
  localTime: string | null;
  isDaytime: boolean;
  condition: Condition & { iconUrl: string };
  temperature: { current: number; feelsLike: number | null; min: number | null; max: number | null };
  humidity: number | null;
  pressure: number | null;
  visibility: number | null;
  cloudiness: number | null;
  wind: { speed: number | null; direction: number | null; directionLabel: string | null; gust: number | null };
  precipitation: { rainLastHour: number | null; snowLastHour: number | null };
  sun: { sunrise: string | null; sunset: string | null };
  timezoneOffsetSeconds: number | null;
  units: UnitLabels;
}

export class CurrentWeather {
  location: Location = { name: null, state: null, country: null, latitude: 0, longitude: 0 };
  observedAt: Date = new Date(0);
  condition: Condition = { id: 0, group: '', description: '', icon: '' };
  temperature: number = 0;
  feelsLike: number | null = null;
  temperatureMin: number | null = null;
  temperatureMax: number | null = null;
  humidity: number | null = null;
  pressure: number | null = null;
  visibility: number | null = null;
  cloudiness: number | null = null;
  windSpeed: number | null = null;
  windDirection: number | null = null;
  windGust: number | null = null;
  rainLastHour: number | null = null;
  snowLastHour: number | null = null;
  sunrise: Date | null = null;
  sunset: Date | null = null;
  timezoneOffsetSeconds: number | null = null;
  units!: UnitLabels;

  get isDaytime(): boolean {
    return this.condition.icon.endsWith('d');
  }

  toPublic(): PublicCurrentWeather {
    return {
      location: this.location,
      observedAt: this.observedAt.toISOString(),
      localTime: this.timezoneOffsetSeconds === null ? null : toLocalIso(this.observedAt, this.timezoneOffsetSeconds),
      isDaytime: this.isDaytime,
      condition: { ...this.condition, iconUrl: `https://openweathermap.org/img/wn/${this.condition.icon}@2x.png` },
      temperature: {
        current: round1(this.temperature),
        feelsLike: roundOrNull(this.feelsLike),
        min: roundOrNull(this.temperatureMin),
        max: roundOrNull(this.temperatureMax),
      },
      humidity: this.humidity,
      pressure: this.pressure,
      visibility: this.visibility,
      cloudiness: this.cloudiness,
      wind: {
        speed: roundOrNull(this.windSpeed),
        direction: this.windDirection,
        directionLabel: this.windDirection === null ? null : compassPoint(this.windDirection),
        gust: roundOrNull(this.windGust),
      },
      precipitation: { rainLastHour: this.rainLastHour, snowLastHour: this.snowLastHour },
      sun: { sunrise: this.sunrise?.toISOString() ?? null, sunset: this.sunset?.toISOString() ?? null },
      timezoneOffsetSeconds: this.timezoneOffsetSeconds,
      units: this.units,
    };
  }
}
