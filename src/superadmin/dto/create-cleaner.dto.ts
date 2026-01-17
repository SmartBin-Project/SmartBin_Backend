import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';
export class CreateCleanerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  telegramChatId: string;

  @IsString()
  @IsNotEmpty()
  area: string;

  @IsOptional()
  @IsArray()
  pictureCleaner?: string[];
}
