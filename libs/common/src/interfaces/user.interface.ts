export interface IUser {
  id: string;
  email: string;
  username: string;
  roles: string[];
}

export interface IJwtPayload {
  sub: string;
  email: string;
  username: string;
  roles: string[];
  iat?: number;
  exp?: number;
}
