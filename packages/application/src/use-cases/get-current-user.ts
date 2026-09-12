import type { User } from "@octro/contracts";
import { NotFoundError } from "../errors.js";
import { toUserDTO, type UserRepository } from "../ports/user-repository.js";

export interface GetCurrentUserQuery {
  userId: string;
}

export class GetCurrentUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(query: GetCurrentUserQuery): Promise<User> {
    const user = await this.users.findById(query.userId);
    if (!user) {
      throw new NotFoundError("User", query.userId);
    }
    return toUserDTO(user);
  }
}
