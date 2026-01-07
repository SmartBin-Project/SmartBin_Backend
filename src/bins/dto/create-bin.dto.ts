import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';

export class CreateBinDto {
  @IsString()
  @IsNotEmpty()
  binCode: string;

  @IsString()
  @IsNotEmpty()
  area: string;

  @IsObject()
  @IsNotEmpty()
  location: {
    lat: number;
    lng: number;
  };

  @IsNumber()
  @IsOptional()
  fillLevel?: number;

  @IsEnum(['EMPTY', 'HALF', 'FULL'])
  @IsOptional()
  status?: 'EMPTY' | 'HALF' | 'FULL';

  @IsOptional()
  @IsArray()
  pictureBins: string[];
}
