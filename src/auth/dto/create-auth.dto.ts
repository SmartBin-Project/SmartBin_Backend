import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDTO {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, {
    message: 'Password is too short. Minimum length is 8 characters',
  })
  password: string;

  @IsString()
  role: string;

  @IsString()
  @IsOptional()
  area?: string;
}
