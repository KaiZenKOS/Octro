import type { UserRecord, UserRepository } from "../../ports/user-repository.js";

// Doublure explicite (Phase A), remplacee par l'adaptateur PostgreSQL en
// Phase C. Ne conserve rien entre deux processus.
export class InMemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, UserRecord>();

  async save(user: UserRecord): Promise<void> {
    this.byId.set(user.id, user);
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    for (const user of this.byId.values()) {
      if (user.email === email) return user;
    }
    return null;
  }
}
