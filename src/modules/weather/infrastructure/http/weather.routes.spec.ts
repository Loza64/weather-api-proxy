import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../../../app';
import { buildContainer } from '../../../../composition-root';
import {
  GEOCODE_PATH,
  MockOpenWeather,
  sanSalvadorLocation,
  sanSalvadorWeather,
  startMockOpenWeather,
  WEATHER_PATH,
} from '../../../../testing/mock-openweather';
import { OpenWeatherClient } from '../openweather/openweather.client';
import { OpenWeatherProvider } from '../openweather/openweather.provider';

const API_KEY = 'super-secret-key-123';

describe('weather API (end to end against a mock of the provider)', () => {
  let mock: MockOpenWeather;
  let app: Express;

  beforeEach(async () => {
    mock = await startMockOpenWeather();
    const client = new OpenWeatherClient({ baseURL: mock.url, apiKey: API_KEY, timeoutMs: 300 });
    app = createApp(buildContainer(new OpenWeatherProvider(client)));
    mock.respond(GEOCODE_PATH, { status: 200, body: [sanSalvadorLocation] });
    mock.respond(WEATHER_PATH, { status: 200, body: sanSalvadorWeather });
  });

  afterEach(async () => {
    await mock.close();
  });

  describe('GET /api/weather/current', () => {
    it('by city: geocodes it and returns the processed weather', async () => {
      const res = await request(app).get('/api/weather/current').query({ city: 'San Salvador', country: 'sv' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        location: { name: 'San Salvador', state: 'San Salvador Department', country: 'SV', latitude: 13.6989, longitude: -89.1914 },
        observedAt: '2026-11-01T18:00:00.000Z',
        localTime: '2026-11-01T12:00:00-06:00',
        isDaytime: true,
        condition: { id: 801, group: 'Clouds', description: 'few clouds', icon: '02d', iconUrl: 'https://openweathermap.org/img/wn/02d@2x.png' },
        temperature: { current: 28.4, feelsLike: 31, min: 26.9, max: 29.8 },
        humidity: 62,
        pressure: 1012,
        visibility: 10000,
        cloudiness: 20,
        wind: { speed: 3.6, direction: 95, directionLabel: 'E', gust: 5.1 },
        precipitation: { rainLastHour: null, snowLastHour: null },
        sun: { sunrise: '2026-11-01T11:40:00.000Z', sunset: '2026-11-01T23:30:00.000Z' },
        timezoneOffsetSeconds: -21600,
        units: { system: 'metric', temperature: 'celsius', windSpeed: 'm/s' },
      });
      expect(mock.requests.map((r) => r.path)).toEqual([GEOCODE_PATH, WEATHER_PATH]);
      expect(mock.requests[0].query.get('q')).toBe('San Salvador,SV');
      expect(mock.requests[0].query.get('limit')).toBe('1');
      expect(mock.requests[1].query.get('lat')).toBe('13.6989');
      expect(mock.requests[1].query.get('lon')).toBe('-89.1914');
    });

    it('by coordinates: skips the geocoding and forwards units and language', async () => {
      const res = await request(app).get('/api/weather/current').query({ lat: '13.7', lon: '-89.2', units: 'imperial', lang: 'es' });

      expect(res.status).toBe(200);
      expect(res.body.data.units).toMatchObject({ system: 'imperial', temperature: 'fahrenheit', windSpeed: 'mph' });
      expect(res.body.data.location).toMatchObject({ name: 'San Salvador', state: null, country: 'SV' });
      expect(mock.requests.map((r) => r.path)).toEqual([WEATHER_PATH]);
      expect(mock.requests[0].query.get('units')).toBe('imperial');
      expect(mock.requests[0].query.get('lang')).toBe('es');
    });

    it('never exposes the provider api key in a response', async () => {
      const ok = await request(app).get('/api/weather/current').query({ city: 'San Salvador' });
      mock.respond(GEOCODE_PATH, { status: 401, body: { cod: 401, message: `Invalid API key ${API_KEY}` } });
      const failed = await request(app).get('/api/weather/current').query({ city: 'San Salvador' });

      expect(JSON.stringify(ok.body)).not.toContain(API_KEY);
      expect(JSON.stringify(failed.body)).not.toContain(API_KEY);
      expect(JSON.stringify(failed.headers)).not.toContain(API_KEY);
    });

    describe('input errors (400) never reach the provider', () => {
      it.each([
        ['no location', {}],
        ['city with coordinates', { city: 'San Salvador', lat: '1', lon: '1' }],
        ['only lat', { lat: '1' }],
        ['country without city', { country: 'SV', lat: '1', lon: '1' }],
        ['lat out of range', { lat: '95', lon: '0' }],
        ['invalid units', { city: 'San Salvador', units: 'kelvin' }],
        ['invalid language', { city: 'San Salvador', lang: 'xx' }],
        ['a parameter we do not support', { city: 'San Salvador', appid: 'x' }],
      ])('%s', async (_label, query) => {
        const res = await request(app).get('/api/weather/current').query(query);

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ status: 400, message: expect.any(String) });
        expect(mock.requests).toHaveLength(0);
      });
    });

    it('404 when the city does not exist', async () => {
      mock.respond(GEOCODE_PATH, { status: 200, body: [] });

      const res = await request(app).get('/api/weather/current').query({ city: 'Atlantis' });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Atlantis');
      expect(mock.requests.map((r) => r.path)).toEqual([GEOCODE_PATH]);
    });

    it.each([
      ['rate limit', 429, 429],
      ['server error', 500, 502],
      ['invalid credentials', 401, 502],
    ])('maps a provider %s to %d', async (_label, upstream, expected) => {
      mock.respond(WEATHER_PATH, { status: upstream, body: { cod: upstream, message: 'x' } });

      const res = await request(app).get('/api/weather/current').query({ lat: '1', lon: '1' });

      expect(res.status).toBe(expected);
      expect(res.body.status).toBe(expected);
    });

    it('504 when the provider is too slow', async () => {
      mock.respond(WEATHER_PATH, { status: 200, body: sanSalvadorWeather, delayMs: 800 });

      const res = await request(app).get('/api/weather/current').query({ lat: '1', lon: '1' });

      expect(res.status).toBe(504);
    });

    it('502 when the provider returns a broken payload', async () => {
      mock.respond(WEATHER_PATH, { status: 200, body: { main: {} } });

      const res = await request(app).get('/api/weather/current').query({ lat: '1', lon: '1' });

      expect(res.status).toBe(502);
    });
  });

  describe('GET /api/locations/search', () => {
    it('returns the candidate locations', async () => {
      mock.respond(GEOCODE_PATH, {
        status: 200,
        body: [
          { name: 'Santa Ana', lat: 13.9942, lon: -89.5597, country: 'SV', state: 'Santa Ana Department', local_names: { es: 'Santa Ana' } },
          { name: 'Santa Ana', lat: 33.7456, lon: -117.8678, country: 'US', state: 'California' },
        ],
      });

      const res = await request(app).get('/api/locations/search').query({ q: 'Santa Ana', limit: '2' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        data: [
          { name: 'Santa Ana', state: 'Santa Ana Department', country: 'SV', latitude: 13.9942, longitude: -89.5597 },
          { name: 'Santa Ana', state: 'California', country: 'US', latitude: 33.7456, longitude: -117.8678 },
        ],
      });
      expect(mock.requests[0].query.get('limit')).toBe('2');
    });

    it('returns an empty list, not an error, when there are no matches', async () => {
      mock.respond(GEOCODE_PATH, { status: 200, body: [] });

      const res = await request(app).get('/api/locations/search').query({ q: 'zzzzzz' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ data: [] });
    });

    it.each([
      ['missing q', {}],
      ['q too short', { q: 'a' }],
      ['limit above 5', { q: 'Santa Ana', limit: '10' }],
    ])('400: %s', async (_label, query) => {
      const res = await request(app).get('/api/locations/search').query(query);

      expect(res.status).toBe(400);
      expect(mock.requests).toHaveLength(0);
    });

    it('maps provider failures', async () => {
      mock.respond(GEOCODE_PATH, { status: 429, body: { cod: 429, message: 'blocked' } });

      const res = await request(app).get('/api/locations/search').query({ q: 'Santa Ana' });

      expect(res.status).toBe(429);
    });
  });

  it('documents both endpoints in the OpenAPI spec', async () => {
    const res = await request(app).get('/api-docs.json');

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.paths).sort()).toEqual(['/api/locations/search', '/api/weather/current']);
    expect(Object.keys(res.body.components.schemas).sort()).toEqual(['CurrentWeatherQueryDto', 'LocationSearchQueryDto']);
  });
});
