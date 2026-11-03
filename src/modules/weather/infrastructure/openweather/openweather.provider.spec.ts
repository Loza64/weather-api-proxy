import { AddressInfo } from 'net';
import { createServer } from 'http';
import {
  GEOCODE_PATH,
  MockOpenWeather,
  sanSalvadorLocation,
  sanSalvadorWeather,
  startMockOpenWeather,
  WEATHER_PATH,
} from '../../../../testing/mock-openweather';
import { UnitSystem } from '../../domain/units';
import { OpenWeatherClient } from './openweather.client';
import { OpenWeatherProvider } from './openweather.provider';

const API_KEY = 'super-secret-key-123';

describe('OpenWeatherProvider (against a local mock of the provider)', () => {
  let mock: MockOpenWeather;
  const makeProvider = (timeoutMs = 1000, baseURL = mock.url) =>
    new OpenWeatherProvider(new OpenWeatherClient({ baseURL, apiKey: API_KEY, timeoutMs }));

  beforeEach(async () => {
    mock = await startMockOpenWeather();
  });

  afterEach(async () => {
    await mock.close();
  });

  describe('requests', () => {
    it('searches locations with q, limit and the api key', async () => {
      mock.respond(GEOCODE_PATH, { status: 200, body: [sanSalvadorLocation] });

      const locations = await makeProvider().searchLocations('San Salvador,SV', 3);

      expect(locations).toEqual([
        { name: 'San Salvador', state: 'San Salvador Department', country: 'SV', latitude: 13.6989, longitude: -89.1914 },
      ]);
      expect(mock.requests).toHaveLength(1);
      expect(mock.requests[0].path).toBe(GEOCODE_PATH);
      expect(Object.fromEntries(mock.requests[0].query)).toEqual({ q: 'San Salvador,SV', limit: '3', appid: API_KEY });
    });

    it('requests the weather by coordinates with units, language and the api key', async () => {
      mock.respond(WEATHER_PATH, { status: 200, body: sanSalvadorWeather });

      const weather = await makeProvider().getCurrentWeather(
        { latitude: 13.6989, longitude: -89.1914 },
        { units: UnitSystem.IMPERIAL, lang: 'es' },
      );

      expect(Object.fromEntries(mock.requests[0].query)).toEqual({
        lat: '13.6989',
        lon: '-89.1914',
        units: 'imperial',
        lang: 'es',
        appid: API_KEY,
      });
      expect(weather.units.temperature).toBe('fahrenheit');
      expect(weather.condition.description).toBe('few clouds');
    });

    it('encodes special characters in the search text', async () => {
      mock.respond(GEOCODE_PATH, { status: 200, body: [] });

      await makeProvider().searchLocations('São Paulo & co,BR', 1);

      expect(mock.requests[0].query.get('q')).toBe('São Paulo & co,BR');
    });

    it('returns an empty list when the provider finds nothing', async () => {
      mock.respond(GEOCODE_PATH, { status: 200, body: [] });

      await expect(makeProvider().searchLocations('zzzzzz', 1)).resolves.toEqual([]);
    });
  });

  describe('error translation', () => {
    const search = (provider = makeProvider()) => provider.searchLocations('x1', 1);

    it('401: hides the provider credentials problem behind a generic 502', async () => {
      mock.respond(GEOCODE_PATH, {
        status: 401,
        body: { cod: 401, message: `Invalid API key ${API_KEY}. Please see https://openweathermap.org/faq#error401` },
      });

      const error = await search().catch((err) => err);

      expect(error).toMatchObject({ statusCode: 502, message: 'El servicio meteorológico no está disponible en este momento' });
      expect(error.message).not.toContain(API_KEY);
      expect(error.message).not.toContain('API key');
    });

    it('404: location without data', async () => {
      mock.respond(WEATHER_PATH, { status: 404, body: { cod: '404', message: 'city not found' } });

      await expect(
        makeProvider().getCurrentWeather({ latitude: 1, longitude: 1 }, { units: UnitSystem.METRIC, lang: 'en' }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('429: provider rate limit', async () => {
      mock.respond(GEOCODE_PATH, { status: 429, body: { cod: 429, message: 'Your account is temporary blocked' } });

      await expect(search()).rejects.toMatchObject({ statusCode: 429 });
    });

    it.each([500, 502, 503, 400, 403])('%d from the provider becomes a 502', async (status) => {
      mock.respond(GEOCODE_PATH, { status, body: { cod: status, message: 'boom' } });

      await expect(search()).rejects.toMatchObject({ statusCode: 502 });
    });

    it('does not follow redirects', async () => {
      mock.respond(GEOCODE_PATH, { status: 302, headers: { Location: 'http://example.invalid/steal' }, body: {} });

      await expect(search()).rejects.toMatchObject({ statusCode: 502 });
    });

    it('502 when the provider answers 200 with something that is not JSON', async () => {
      mock.respond(GEOCODE_PATH, { status: 200, raw: '<html>maintenance</html>' });

      await expect(search()).rejects.toMatchObject({ statusCode: 502, message: expect.stringContaining('inválida') });
    });

    it('502 when the weather payload is incomplete', async () => {
      mock.respond(WEATHER_PATH, { status: 200, body: { coord: { lat: 1, lon: 1 } } });

      await expect(
        makeProvider().getCurrentWeather({ latitude: 1, longitude: 1 }, { units: UnitSystem.METRIC, lang: 'en' }),
      ).rejects.toMatchObject({ statusCode: 502 });
    });

    it('504 when the provider takes longer than the timeout', async () => {
      mock.respond(GEOCODE_PATH, { status: 200, body: [], delayMs: 400 });

      await expect(search(makeProvider(100))).rejects.toMatchObject({ statusCode: 504 });
    });

    it('502 when the provider cannot be reached', async () => {
      const closed = createServer();
      await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
      const { port } = closed.address() as AddressInfo;
      await new Promise<void>((resolve) => closed.close(() => resolve()));

      const error = await search(makeProvider(1000, `http://127.0.0.1:${port}`)).catch((err) => err);

      expect(error).toMatchObject({ statusCode: 502, message: 'No se pudo conectar con el servicio meteorológico' });
      expect(error.message).not.toContain(API_KEY);
    });
  });
});
