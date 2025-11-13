export class UserDto {
  id: number;
  username: string;
  email: string;
  avatar?: string | null;
}

export class RegisterUserDto {
  username: string;
  email: string;
  password: string;
}

export class LoginUserDto {
  email: string;
  password: string;
}

export class AuthResponseDto {
  user: UserDto;
  token?: string;
  refreshToken?: string;
}