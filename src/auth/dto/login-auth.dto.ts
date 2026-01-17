import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
export class LoginDTO {
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, {
    message: 'Password is too short. Minimum length is 8 characters',
  })
  password: string;
}
