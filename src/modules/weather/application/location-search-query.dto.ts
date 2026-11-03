import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

const toNumber = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (value.trim() === '' ? Number.NaN : Number(value)) : value;

export class LocationSearchQueryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q!: string;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(5)
  limit: number = 5;
}
