import type { NetworkCapabilities } from "@octro/contracts";

// Port reseau (S1). L'adaptateur reel interroge XRPL apres G0 (Augustin,
// A1) ; en attendant, un adaptateur statique renvoie l'etat non verifie de
// docs/v2.2/hackathon.config.json, jamais un succes fabrique (NET-02).
export interface NetworkCapabilitiesPort {
  get(): Promise<NetworkCapabilities>;
}
