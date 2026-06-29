export interface CreateGuestDto {
  ipAddress: string;
  userAgent: string;
}

export interface LoginResponseDto {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    provider: 'google' | 'guest';
    avatar?: string;
  };
}

export interface UserProfileDto {
  id: string;
  email: string;
  name: string;
  provider: 'google' | 'guest';
  avatar?: string;
}
