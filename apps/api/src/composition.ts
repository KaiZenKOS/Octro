// Composition API de la tranche verticale : Workspace et evenements restent
// en memoire (redemarrage non persistant), tandis que le calcul est delegue au
// moteur Python. Le port reseau est injectable; par defaut il lit le registre
// v2.2 observe et retombe en mode inconnu/fail-closed s'il est absent ou invalide.
import {
  ApproveFinancingActionUseCase,
  CreateWorkspaceUseCase,
  GetPersonalProjectionUseCase,
  GetNetworkCapabilitiesUseCase,
  GetWorkspaceUseCase,
  InMemoryEconomicEventRepository,
  InMemoryWorkspaceRepository,
  RecordDeclaredEventUseCase,
  StaticNetworkCapabilitiesAdapter,
  SystemClock,
  UuidIdGenerator,
  type Clock,
  type NetworkCapabilitiesPort,
  type OptimizerPort,
} from "@octro/application";
import { loadNetworkCapabilitiesConfig } from "./adapters/network-capabilities-config.js";
import { PythonOptimizerAdapter } from "./adapters/python-optimizer-adapter.js";

export interface DependencyOverrides {
  optimizer?: OptimizerPort;
  networkCapabilities?: NetworkCapabilitiesPort;
  hackathonConfigPath?: string;
  clock?: Clock;
}

export interface AppDependencies {
  createWorkspace: CreateWorkspaceUseCase;
  getWorkspace: GetWorkspaceUseCase;
  recordDeclaredEvent: RecordDeclaredEventUseCase;
  getPersonalProjection: GetPersonalProjectionUseCase;
  getNetworkCapabilities: GetNetworkCapabilitiesUseCase;
  approveFinancingAction: ApproveFinancingActionUseCase;
}

export function buildDependencies(overrides: DependencyOverrides = {}): AppDependencies {
  const workspaces = new InMemoryWorkspaceRepository();
  const events = new InMemoryEconomicEventRepository();
  const clock = overrides.clock ?? new SystemClock();
  const ids = new UuidIdGenerator();
  const optimizer = overrides.optimizer ?? new PythonOptimizerAdapter();
  const capabilities = overrides.networkCapabilities
    ?? new StaticNetworkCapabilitiesAdapter(loadNetworkCapabilitiesConfig({
      ...(overrides.hackathonConfigPath === undefined ? {} : { configPath: overrides.hackathonConfigPath }),
    }));

  return {
    createWorkspace: new CreateWorkspaceUseCase(workspaces, clock, ids),
    getWorkspace: new GetWorkspaceUseCase(workspaces),
    recordDeclaredEvent: new RecordDeclaredEventUseCase(workspaces, events, clock, ids),
    getPersonalProjection: new GetPersonalProjectionUseCase(workspaces, events, optimizer, clock),
    getNetworkCapabilities: new GetNetworkCapabilitiesUseCase(capabilities),
    approveFinancingAction: new ApproveFinancingActionUseCase(workspaces, capabilities),
  };
}
