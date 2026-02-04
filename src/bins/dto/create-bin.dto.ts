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

  @IsObject()
  @IsNotEmpty()
  area: {
    en: string;
    kh: string;
  };

  @IsObject()
  @IsNotEmpty()
  location: {
    lat: number;
    lng: number;
  };

  @IsNumber()
  @IsOptional()
  fillLevel?: number;

  @IsEnum(['EMPTY', 'HALF', 'NEARLY FULL', 'FULL'])
  @IsOptional()
  status?: 'EMPTY' | 'HALF' | 'NEARLY FULL' | 'FULL';

  @IsOptional()
  @IsArray()
  pictureBins: string[];

  @IsObject()
  addressBin: {
    en: string;
    kh: string;
  };
}
