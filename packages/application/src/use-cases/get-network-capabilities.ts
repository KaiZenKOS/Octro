import type { NetworkCapabilities } from "@octro/contracts";
import type { NetworkCapabilitiesPort } from "../ports/network-capabilities-port.js";

// NET-02: a read-only view of effective capability state. It has no side
// effects and forecasting deliberately does not depend on this use case.
export class GetNetworkCapabilitiesUseCase {
  constructor(private readonly capabilities: NetworkCapabilitiesPort) {}

  async execute(): Promise<NetworkCapabilities> {
    return await this.capabilities.get();
  }
}
