import type {
  PersonalOptimizerInput,
  PersonalOptimizerResult,
} from "@octro/contracts";

// The API composition supplies a transport adapter for the deterministic
// Python engine. Application owns this port; it never reimplements finance.
export interface OptimizerPort {
  optimizePersonal(input: PersonalOptimizerInput): Promise<PersonalOptimizerResult>;
}
