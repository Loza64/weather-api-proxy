import { sanSalvadorWeather } from '../../../../testing/mock-openweather';
import { UnitSystem } from '../../domain/units';
import { toCurrentWeather, toLocations } from './openweather.mapper';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe('toCurrentWeather', () => {
  it('maps a complete provider response', () => {
    const weather = toCurrentWeather(sanSalvadorWeather, UnitSystem.METRIC);

    expect(weather.location).toEqual({ name: 'San Salvador', state: null, country: 'SV', latitude: 13.6989, longitude: -89.1914 });
    expect(weather.observedAt.toISOString()).toBe('2026-11-01T18:00:00.000Z');
    expect(weather.condition).toEqual({ id: 801, group: 'Clouds', description: 'few clouds', icon: '02d' });
    expect(weather).toMatchObject({
      temperature: 28.44,
      feelsLike: 31.02,
      temperatureMin: 26.9,
      temperatureMax: 29.83,
      humidity: 62,
      pressure: 1012,
      visibility: 10000,
      cloudiness: 20,
      windSpeed: 3.64,
      windDirection: 95,
      windGust: 5.14,
      timezoneOffsetSeconds: -21600,
    });
    expect(weather.sunrise?.toISOString()).toBe('2026-11-01T11:40:00.000Z');
    expect(weather.units.temperature).toBe('celsius');
  });

  it('tolerates the optional fields missing, as the provider documents', () => {
    const minimal = {
      coord: { lon: 10.99, lat: 44.34 },
      weather: [{ id: 501, main: 'Rain', description: 'moderate rain', icon: '10d' }],
      main: { temp: 298.48 },
      dt: 1661870592,
      name: '',
    };

    const weather = toCurrentWeather(minimal, UnitSystem.STANDARD);

    expect(weather.location.name).toBeNull();
    expect(weather).toMatchObject({
      feelsLike: null,
      humidity: null,
      pressure: null,
      visibility: null,
      cloudiness: null,
      windSpeed: null,
      windGust: null,
      rainLastHour: null,
      snowLastHour: null,
      timezoneOffsetSeconds: null,
      sunrise: null,
    });
    expect(weather.units.temperature).toBe('kelvin');
  });

  it('reads rain and snow of the last hour', () => {
    const payload = { ...clone(sanSalvadorWeather), rain: { '1h': 3.16 }, snow: { '1h': 0.4 } };

    expect(toCurrentWeather(payload, UnitSystem.METRIC)).toMatchObject({ rainLastHour: 3.16, snowLastHour: 0.4 });
  });

  it('ignores values of the wrong type instead of trusting them', () => {
    const payload = clone(sanSalvadorWeather) as Record<string, unknown>;
    payload.visibility = '10000';
    (payload.main as Record<string, unknown>).humidity = null;

    expect(toCurrentWeather(payload, UnitSystem.METRIC)).toMatchObject({ visibility: null, humidity: null });
  });

  const broken: Array<[string, (payload: Record<string, any>) => unknown]> = [
    ['not an object', () => 'oops'],
    ['an array', () => []],
    ['null', () => null],
    ['no coordinates', (p) => ({ ...p, coord: undefined })],
    ['string coordinates', (p) => ({ ...p, coord: { lat: '13', lon: '-89' } })],
    ['empty weather list', (p) => ({ ...p, weather: [] })],
    ['weather without icon', (p) => ({ ...p, weather: [{ id: 1, main: 'x', description: 'y' }] })],
    ['no temperature', (p) => ({ ...p, main: { humidity: 50 } })],
    ['non numeric temperature', (p) => ({ ...p, main: { temp: 'hot' } })],
    ['no timestamp', (p) => ({ ...p, dt: undefined })],
  ];

  it.each(broken)('502 when the response has %s', (_label, mutate) => {
    expect(() => toCurrentWeather(mutate(clone(sanSalvadorWeather)), UnitSystem.METRIC)).toThrow(
      expect.objectContaining({ statusCode: 502 }),
    );
  });
});

describe('toLocations', () => {
  it('maps results and keeps only the fields we expose', () => {
    const locations = toLocations([
      { name: 'Santa Ana', local_names: { es: 'Santa Ana' }, lat: 13.9942, lon: -89.5597, country: 'SV', state: 'Santa Ana Department' },
      { name: 'Santa Ana', lat: 33.7456, lon: -117.8678, country: 'US', state: 'California' },
    ]);

    expect(locations).toEqual([
      { name: 'Santa Ana', state: 'Santa Ana Department', country: 'SV', latitude: 13.9942, longitude: -89.5597 },
      { name: 'Santa Ana', state: 'California', country: 'US', latitude: 33.7456, longitude: -117.8678 },
    ]);
  });

  it('uses null for fields that vary by country and skips entries without coordinates', () => {
    const locations = toLocations([{ name: 'Paris', lat: 48.85, lon: 2.35, country: 'FR' }, { name: 'Broken' }, 'junk', null]);

    expect(locations).toEqual([{ name: 'Paris', state: null, country: 'FR', latitude: 48.85, longitude: 2.35 }]);
  });

  it('returns an empty list for no matches', () => {
    expect(toLocations([])).toEqual([]);
  });

  it.each([[{}], ['nope'], [null], [undefined]])('502 when the response is not a list (%p)', (payload) => {
    expect(() => toLocations(payload)).toThrow(expect.objectContaining({ statusCode: 502 }));
  });
});
