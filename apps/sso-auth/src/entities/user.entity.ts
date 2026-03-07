export interface UserProvider {
  provider: string;
  providerId: string;
}

export class User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  providers: UserProvider[];
  roles: string[];
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
