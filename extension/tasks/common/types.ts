// Common types for Toggly API

export interface TogglyConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  authority: string;
}

export interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface FeatureFilter {
  name: string;
  parameters: Record<string, any>;
}

export interface FeatureChangeRequest {
  flagKey: string;
  fromState?: FeatureFilter[] | null;
  toState: FeatureFilter[];
}

export interface CreateReleaseRequest {
  applicationId: string;
  name: string;
  releaseNotes?: string;
  featureChanges?: FeatureChangeRequest[];
}

export interface ReleaseResponse {
  id: string;
  applicationId: string;
  environment: string;
  name: string;
  status: string;
  releaseNotes?: string;
  featureChanges?: FeatureChangeRequest[];
  ciLinks?: CILink[];
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
  rolledBackAt?: string;
}

export interface BuildInfo {
  runId: string;
  runUrl?: string;
  pipelineName: string;
  branch?: string;
  commitSha?: string;
  buildNumber?: string;
}

export interface AssociateBuildRequest {
  projectKey: string;
  environment: string;
  ciProvider: string;
  build: BuildInfo;
  mode?: string;
  releaseTemplateKey?: string;
  createOptions?: {
    namePattern?: string;
  };
  matchCriteria?: {
    byBranch?: boolean;
    byService?: boolean;
  };
}

export interface AssociateBuildResponse {
  releaseId: string;
  releaseUrl?: string;
}

export interface CILink {
  provider: string;
  pipelineName: string;
  runId: string;
  runUrl?: string;
  branch?: string;
  commitSha?: string;
  buildNumber?: string;
}

export interface FeatureDefinitionCreateModel {
  name: string;
  featureKey: string;
  description?: string;
  category?: string;
  tags?: string[];
  environmentFilters?: Record<string, FeatureFilter[]>;
}

export interface FeatureDefinition {
  featureKey: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
}

export interface GateStatus {
  gateId: string;
  name: string;
  status: 'pending' | 'passed' | 'failed';
  lastCheckedAt?: string;
  details?: any;
}

export interface GateStatusResponse {
  releaseId: string;
  overallStatus: 'pending' | 'passed' | 'failed';
  gates: GateStatus[];
}

export interface ReleaseDetails extends ReleaseResponse {
  gateStatus?: GateStatusResponse;
  latestGateEvaluations?: any[];
  latestDeploymentEvents?: any[];
}

