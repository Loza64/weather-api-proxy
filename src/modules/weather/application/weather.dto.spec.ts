import 'reflect-metadata';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CurrentWeatherQueryDto } from './current-weather-query.dto';
import { LocationSearchQueryDto } from './location-search-query.dto';

const check = <T extends object>(dto: ClassConstructor<T>, query: Record<string, string>) =>
  validate(plainToInstance(dto, query), { whitelist: true, forbidNonWhitelisted: true });

describe('CurrentWeatherQueryDto', () => {
  it('applies the defaults and normalizes the input', async () => {
    const dto = plainToInstance(CurrentWeatherQueryDto, { city: '  San Salvador ', country: ' sv ', units: 'IMPERIAL', lang: 'ES' });

    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
    expect(dto).toMatchObject({ city: 'San Salvador', country: 'SV', units: 'imperial', lang: 'es' });

    const empty = plainToInstance(CurrentWeatherQueryDto, {});
    expect(empty).toMatchObject({ units: 'metric', lang: 'en' });
  });

  it('converts coordinates from the query string, keeping 0 as a valid value', async () => {
    const dto = plainToInstance(CurrentWeatherQueryDto, { lat: '0', lon: '-89.19' });

    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
    expect(dto.lat).toBe(0);
    expect(dto.lon).toBe(-89.19);
  });

  it.each([
    ['one letter city', { city: 'a' }],
    ['city too long', { city: 'x'.repeat(101) }],
    ['country with 3 letters', { city: 'x1', country: 'SLV' }],
    ['numeric country', { city: 'x1', country: '12' }],
    ['lat out of range', { lat: '91', lon: '0' }],
    ['lon out of range', { lat: '0', lon: '-181' }],
    ['lat not a number', { lat: 'abc', lon: '0' }],
    ['empty lat', { lat: '', lon: '0' }],
    ['unknown units', { city: 'x1', units: 'kelvin' }],
    ['unknown language', { city: 'x1', lang: 'xx' }],
    ['unknown parameter', { city: 'x1', appid: 'steal' }],
  ])('rejects: %s', async (_label, query) => {
    expect((await check(CurrentWeatherQueryDto, query)).length).toBeGreaterThan(0);
  });

  it.each(['es', 'en', 'pt_br', 'zh_cn', 'cz', 'ua'])('accepts the provider language %s', async (lang) => {
    expect(await check(CurrentWeatherQueryDto, { city: 'x1', lang })).toHaveLength(0);
  });
});

describe('LocationSearchQueryDto', () => {
  it('accepts a query and defaults the limit to 5', async () => {
    const dto = plainToInstance(LocationSearchQueryDto, { q: ' Santa Ana,SV ' });

    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
    expect(dto).toMatchObject({ q: 'Santa Ana,SV', limit: 5 });
  });

  it.each([
    ['missing q', {}],
    ['short q', { q: 'a' }],
    ['limit 0', { q: 'ab', limit: '0' }],
    ['limit 6', { q: 'ab', limit: '6' }],
    ['limit not an integer', { q: 'ab', limit: '2.5' }],
    ['empty limit', { q: 'ab', limit: '' }],
    ['unknown parameter', { q: 'ab', units: 'metric' }],
  ])('rejects: %s', async (_label, query) => {
    expect((await check(LocationSearchQueryDto, query)).length).toBeGreaterThan(0);
  });
});
