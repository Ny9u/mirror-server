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
  verificationCode: string;
}

export class LoginUserDto {
  email: string;
  password: string;
}

export class UpdateUserDto {
  username: string;
}

export class UpdatePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export class VerificationCodeDto {
  email: string;
}

export class VerifyCodeDto {
  email: string;
  code: string;
}

export class AuthResponseDto {
  user: UserDto;
  token?: string;
  refreshToken?: string;
}
