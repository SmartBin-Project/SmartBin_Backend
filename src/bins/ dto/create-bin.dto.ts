import {
  IsNotEmpty,
  IsString,
  IsNumber,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @IsNumber()
  @IsNotEmpty()
  lng: number;
}

export class CreateBinDto {
  @IsString()
  @IsNotEmpty()
  binCode: string;

  @IsString()
  @IsNotEmpty()
  area: string;

  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;
}
