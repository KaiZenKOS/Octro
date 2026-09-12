// NET-02 : une capacite reseau ou de financement inconnue bloque uniquement
// la finance. Ce garde ne doit jamais etre invoque pour un calendrier, une
// saisie, un import ou une projection (ACC-02, PER-11).
import { isCapabilityUsable, type NetworkCapabilities } from "@octro/contracts";

export class NetworkCapabilityUnavailableError extends Error {
  constructor(readonly capability: string) {
    super(`network capability not verified: ${capability} (NET-02)`);
    this.name = "NetworkCapabilityUnavailableError";
  }
}

export function assertFinancingCapability(
  capabilities: NetworkCapabilities,
  capability: string,
): void {
  if (!isCapabilityUsable(capabilities, capability)) {
    throw new NetworkCapabilityUnavailableError(capability);
  }
}
