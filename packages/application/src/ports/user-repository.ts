import type { User } from "@octro/contracts";

// Forme de persistance (jamais exposee telle quelle a un client) : le
// contrat @octro/contracts `User` omet deliberement password_hash.
export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

export interface UserRepository {
  save(user: UserRecord): Promise<void>;
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
}

export function toUserDTO(user: UserRecord): User {
  return {
    id: user.id,
    email: user.email,
    email_verified_at: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    created_at: user.createdAt.toISOString(),
  };
}
