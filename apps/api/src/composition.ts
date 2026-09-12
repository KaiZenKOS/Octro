// Racine de composition (S1). Cable les cas d'usage a des adaptateurs en
// memoire : suffisant pour developper et tester l'API, mais ce n'est PAS
// l'adaptateur PostgreSQL de S3 — rien ici ne doit etre presente comme une
// preuve de persistance reelle (docs/TEAM_TASKS.md section 8).
import {
  ApproveFinancingActionUseCase,
  CreateWorkspaceUseCase,
  GetPersonalProjectionUseCase,
  GetWorkspaceUseCase,
  InMemoryEconomicEventRepository,
  InMemoryWorkspaceRepository,
  RecordDeclaredEventUseCase,
  SimulatedOptimizerAdapter,
  StaticNetworkCapabilitiesAdapter,
  SystemClock,
  UNVERIFIED_HACKATHON_CAPABILITIES,
  UuidIdGenerator,
} from "@octro/application";

export interface AppDependencies {
  createWorkspace: CreateWorkspaceUseCase;
  getWorkspace: GetWorkspaceUseCase;
  recordDeclaredEvent: RecordDeclaredEventUseCase;
  getPersonalProjection: GetPersonalProjectionUseCase;
  approveFinancingAction: ApproveFinancingActionUseCase;
}

export function buildDependencies(): AppDependencies {
  const workspaces = new InMemoryWorkspaceRepository();
  const events = new InMemoryEconomicEventRepository();
  const clock = new SystemClock();
  const ids = new UuidIdGenerator();
  const optimizer = new SimulatedOptimizerAdapter();
  const capabilities = new StaticNetworkCapabilitiesAdapter(UNVERIFIED_HACKATHON_CAPABILITIES);

  return {
    createWorkspace: new CreateWorkspaceUseCase(workspaces, clock, ids),
    getWorkspace: new GetWorkspaceUseCase(workspaces),
    recordDeclaredEvent: new RecordDeclaredEventUseCase(workspaces, events, clock, ids),
    getPersonalProjection: new GetPersonalProjectionUseCase(workspaces, events, optimizer, clock),
    approveFinancingAction: new ApproveFinancingActionUseCase(workspaces, capabilities),
  };
}
