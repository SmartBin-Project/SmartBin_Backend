import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
export class CreateCleanerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  telegramChatId: string;

  @IsString()
  @IsNotEmpty()
  area: string;

  @IsNotEmpty()
  acceptCount: number;

  @IsNotEmpty()
  rejectCount: number;
}
