import { CurrentWeather, compassPoint, toLocalIso } from './current-weather';
import { UnitSystem, unitLabels } from './units';

describe('compassPoint', () => {
  it.each([
    [0, 'N'],
    [11, 'N'],
    [12, 'NNE'],
    [45, 'NE'],
    [90, 'E'],
    [95, 'E'],
    [180, 'S'],
    [225, 'SW'],
    [270, 'W'],
    [348.75, 'N'],
    [359, 'N'],
    [360, 'N'],
    [-90, 'W'],
  ])('%d° -> %s', (degrees, label) => {
    expect(compassPoint(degrees)).toBe(label);
  });
});

describe('toLocalIso', () => {
  const at = new Date('2026-11-01T18:00:00Z');

  it('renders the local time with its offset', () => {
    expect(toLocalIso(at, -21600)).toBe('2026-11-01T12:00:00-06:00');
    expect(toLocalIso(at, 19800)).toBe('2026-11-01T23:30:00+05:30');
    expect(toLocalIso(at, 0)).toBe('2026-11-01T18:00:00+00:00');
  });

  it('moves to the previous day when the offset crosses midnight', () => {
    expect(toLocalIso(new Date('2026-11-01T03:00:00Z'), -21600)).toBe('2026-10-31T21:00:00-06:00');
  });
});

describe('unitLabels', () => {
  it('describes each unit system', () => {
    expect(unitLabels(UnitSystem.METRIC)).toMatchObject({ temperature: 'celsius', windSpeed: 'm/s' });
    expect(unitLabels(UnitSystem.IMPERIAL)).toMatchObject({ temperature: 'fahrenheit', windSpeed: 'mph' });
    expect(unitLabels(UnitSystem.STANDARD)).toMatchObject({ temperature: 'kelvin', windSpeed: 'm/s' });
  });
});

describe('CurrentWeather.toPublic', () => {
  const make = () => {
    const weather = new CurrentWeather();
    weather.location = { name: 'San Salvador', state: null, country: 'SV', latitude: 13.6989, longitude: -89.1914 };
    weather.observedAt = new Date('2026-11-01T18:00:00Z');
    weather.condition = { id: 801, group: 'Clouds', description: 'few clouds', icon: '02d' };
    weather.temperature = 28.44;
    weather.units = unitLabels(UnitSystem.METRIC);
    return weather;
  };

  it('returns nulls for the optional measurements the provider did not send', () => {
    const result = make().toPublic();

    expect(result).toMatchObject({
      humidity: null,
      pressure: null,
      visibility: null,
      cloudiness: null,
      localTime: null,
      timezoneOffsetSeconds: null,
      wind: { speed: null, direction: null, directionLabel: null, gust: null },
      precipitation: { rainLastHour: null, snowLastHour: null },
      sun: { sunrise: null, sunset: null },
      temperature: { current: 28.4, feelsLike: null, min: null, max: null },
    });
  });

  it('adds derived values: day/night, icon url, local time and wind direction label', () => {
    const weather = make();
    weather.timezoneOffsetSeconds = -21600;
    weather.windSpeed = 3.64;
    weather.windDirection = 95;
    weather.sunrise = new Date('2026-11-01T11:40:00Z');

    const result = weather.toPublic();

    expect(result.isDaytime).toBe(true);
    expect(result.condition.iconUrl).toBe('https://openweathermap.org/img/wn/02d@2x.png');
    expect(result.localTime).toBe('2026-11-01T12:00:00-06:00');
    expect(result.wind).toMatchObject({ speed: 3.6, direction: 95, directionLabel: 'E' });
    expect(result.sun.sunrise).toBe('2026-11-01T11:40:00.000Z');
    expect(result.observedAt).toBe('2026-11-01T18:00:00.000Z');
  });

  it('is night when the icon says so', () => {
    const weather = make();
    weather.condition = { ...weather.condition, icon: '02n' };

    expect(weather.toPublic().isDaytime).toBe(false);
  });
});
