import { CurrentWeather } from '../domain/current-weather';
import { Location } from '../domain/location';
import { UnitSystem, unitLabels } from '../domain/units';
import { WeatherProvider } from '../domain/weather-provider';
import { GetCurrentWeatherUseCase } from './get-current-weather.use-case';
import { SearchLocationsUseCase } from './search-locations.use-case';

const SAN_SALVADOR: Location = { name: 'San Salvador', state: 'San Salvador Department', country: 'SV', latitude: 13.6989, longitude: -89.1914 };

const makeWeather = (location: Location = { name: 'Station', state: null, country: 'SV', latitude: 13.7, longitude: -89.2 }) =>
  Object.assign(new CurrentWeather(), { location, temperature: 28, units: unitLabels(UnitSystem.METRIC) });

describe('weather use cases', () => {
  const provider = { searchLocations: jest.fn(), getCurrentWeather: jest.fn() } as unknown as jest.Mocked<WeatherProvider>;
  const defaults = { units: UnitSystem.METRIC, lang: 'en' };

  beforeEach(() => jest.resetAllMocks());

  describe('GetCurrentWeatherUseCase', () => {
    const useCase = new GetCurrentWeatherUseCase(provider);

    it('resolves a city to coordinates first and reports the geocoded location', async () => {
      provider.searchLocations.mockResolvedValue([SAN_SALVADOR]);
      provider.getCurrentWeather.mockResolvedValue(makeWeather());

      const weather = await useCase.execute({ city: 'San Salvador', country: 'SV', units: UnitSystem.IMPERIAL, lang: 'es' });

      expect(provider.searchLocations).toHaveBeenCalledWith('San Salvador,SV', 1);
      expect(provider.getCurrentWeather).toHaveBeenCalledWith(SAN_SALVADOR, { units: UnitSystem.IMPERIAL, lang: 'es' });
      expect(weather.location).toEqual(SAN_SALVADOR);
    });

    it('searches by the city alone when there is no country', async () => {
      provider.searchLocations.mockResolvedValue([SAN_SALVADOR]);
      provider.getCurrentWeather.mockResolvedValue(makeWeather());

      await useCase.execute({ city: 'San Salvador', ...defaults });

      expect(provider.searchLocations).toHaveBeenCalledWith('San Salvador', 1);
    });

    it('404 when the city is unknown, without asking for the weather', async () => {
      provider.searchLocations.mockResolvedValue([]);

      await expect(useCase.execute({ city: 'Atlantis', ...defaults })).rejects.toMatchObject({
        statusCode: 404,
        message: expect.stringContaining('Atlantis'),
      });
      expect(provider.getCurrentWeather).not.toHaveBeenCalled();
    });

    it('uses the coordinates directly, even when they are 0', async () => {
      const weather = makeWeather();
      provider.getCurrentWeather.mockResolvedValue(weather);

      const result = await useCase.execute({ lat: 0, lon: 0, ...defaults });

      expect(provider.searchLocations).not.toHaveBeenCalled();
      expect(provider.getCurrentWeather).toHaveBeenCalledWith({ latitude: 0, longitude: 0 }, defaults);
      expect(result).toBe(weather);
    });

    it.each([
      ['nothing', {}],
      ['city together with coordinates', { city: 'x1', lat: 1, lon: 1 }],
      ['only lat', { lat: 1 }],
      ['only lon', { lon: 1 }],
      ['country without city', { country: 'SV', lat: 1, lon: 1 }],
    ])('400 when the request has %s', async (_label, request) => {
      await expect(useCase.execute({ ...request, ...defaults })).rejects.toMatchObject({ statusCode: 400 });
      expect(provider.searchLocations).not.toHaveBeenCalled();
      expect(provider.getCurrentWeather).not.toHaveBeenCalled();
    });

    it('lets provider errors through untouched', async () => {
      provider.searchLocations.mockRejectedValue(Object.assign(new Error('x'), { statusCode: 504 }));

      await expect(useCase.execute({ city: 'x1', ...defaults })).rejects.toMatchObject({ statusCode: 504 });
    });
  });

  describe('SearchLocationsUseCase', () => {
    it('delegates to the provider', async () => {
      provider.searchLocations.mockResolvedValue([SAN_SALVADOR]);

      await expect(new SearchLocationsUseCase(provider).execute('San Salvador', 3)).resolves.toEqual([SAN_SALVADOR]);
      expect(provider.searchLocations).toHaveBeenCalledWith('San Salvador', 3);
    });
  });
});
