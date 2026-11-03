import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength, Max, Min, MinLength } from 'class-validator';
import { SUPPORTED_LANGUAGES, UnitSystem } from '../domain/units';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);
const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const toNumber = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (value.trim() === '' ? Number.NaN : Number(value)) : value;

export class CurrentWeatherQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @Transform(upper)
  @Matches(/^[A-Z]{2}$/, { message: 'country debe ser un código ISO 3166 de 2 letras, por ejemplo SV' })
  country?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon?: number;

  @IsOptional()
  @Transform(lower)
  @IsEnum(UnitSystem)
  units: UnitSystem = UnitSystem.METRIC;

  @IsOptional()
  @Transform(lower)
  @IsIn(SUPPORTED_LANGUAGES, { message: `lang debe ser uno de: ${SUPPORTED_LANGUAGES.join(', ')}` })
  lang: string = 'en';
}
