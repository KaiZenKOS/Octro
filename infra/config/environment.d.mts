export interface BackendEnvironmentIssue {
  variable: string;
  message: string;
}

export interface BackendEnvironmentReport {
  valid: boolean;
  services: Record<string, boolean>;
  issues: BackendEnvironmentIssue[];
}

export function validateBackendEnvironment(
  env: Readonly<Record<string, string | undefined>>,
): BackendEnvironmentReport;
