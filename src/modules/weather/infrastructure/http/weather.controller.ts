import { NextFunction, Request, Response } from 'express';
import { CurrentWeatherQueryDto } from '../../application/current-weather-query.dto';
import { GetCurrentWeatherUseCase } from '../../application/get-current-weather.use-case';
import { LocationSearchQueryDto } from '../../application/location-search-query.dto';
import { SearchLocationsUseCase } from '../../application/search-locations.use-case';

export class WeatherController {
  constructor(
    private readonly getCurrentWeatherUseCase: GetCurrentWeatherUseCase,
    private readonly searchLocationsUseCase: SearchLocationsUseCase,
  ) {}

  current = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { city, country, lat, lon, units, lang } = req.validatedQuery as CurrentWeatherQueryDto;
      const weather = await this.getCurrentWeatherUseCase.execute({ city, country, lat, lon, units, lang });
      res.status(200).json({ data: weather.toPublic() });
    } catch (err) {
      next(err);
    }
  };

  searchLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { q, limit } = req.validatedQuery as LocationSearchQueryDto;
      const locations = await this.searchLocationsUseCase.execute(q, limit);
      res.status(200).json({ data: locations });
    } catch (err) {
      next(err);
    }
  };
}
