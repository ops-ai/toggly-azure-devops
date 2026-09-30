import axios, { AxiosInstance, AxiosError } from 'axios';
import * as tl from 'azure-pipelines-task-lib/task';
import {
  TogglyConfig,
  OAuth2TokenResponse,
  CreateReleaseRequest,
  ReleaseResponse,
  AssociateBuildRequest,
  AssociateBuildResponse,
  FeatureDefinitionCreateModel,
  FeatureDefinition,
  FeatureFilter,
  GateStatusResponse,
  ReleaseDetails
} from './types';

export class TogglyApiClient {
  private httpClient: AxiosInstance;
  private config: TogglyConfig;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(config: TogglyConfig) {
    this.config = config;
    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Toggly-AzureDevOps-Extension/1.0.0'
      }
    });

    // Add retry logic
    this.httpClient.interceptors.response.use(
      response => response,
      async error => {
        const config = error.config;
        if (!config || !config.retry) {
          config.retry = 0;
        }
        
        if (config.retry >= 3) {
          return Promise.reject(error);
        }
        
        config.retry += 1;
        const delay = Math.pow(2, config.retry) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.httpClient(config);
      }
    );
  }

  /**
   * Acquire OAuth2 access token
   */
  private async acquireToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    tl.debug('Acquiring OAuth2 access token...');

    try {
      const tokenUrl = `${this.config.authority}/connect/token`;
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.config.clientId);
      params.append('client_secret', this.config.clientSecret);
      params.append('scope', 'apiAccess');

      const response = await axios.post<OAuth2TokenResponse>(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      // Set expiry to 90% of the actual expiry time to ensure we refresh before it expires
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000 * 0.9);

      tl.debug('Access token acquired successfully');
      return this.accessToken;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(`Failed to acquire access token: ${axiosError.message}`);
    }
  }

  /**
   * Make authenticated request
   */
  private async makeRequest<T>(method: string, url: string, data?: any): Promise<T> {
    const token = await this.acquireToken();

    try {
      const response = await this.httpClient.request<T>({
        method,
        url,
        data,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage = axiosError.response?.data 
        ? JSON.stringify(axiosError.response.data) 
        : axiosError.message;
      throw new Error(`API request failed: ${errorMessage}`);
    }
  }

  /**
   * Create a new release
   */
  async createRelease(request: CreateReleaseRequest): Promise<ReleaseResponse> {
    tl.debug(`Creating release: ${request.name}`);
    return await this.makeRequest<ReleaseResponse>('POST', '/releases', request);
  }

  /**
   * Associate build with release
   */
  async associateBuild(request: AssociateBuildRequest): Promise<AssociateBuildResponse> {
    tl.debug(`Associating build with release: ${request.projectKey}`);
    return await this.makeRequest<AssociateBuildResponse>('POST', '/releases/associate-build', request);
  }

  /**
   * Get release details
   */
  async getReleaseDetails(releaseId: string): Promise<ReleaseDetails> {
    tl.debug(`Getting release details: ${releaseId}`);
    return await this.makeRequest<ReleaseDetails>('GET', `/releases/${releaseId}`);
  }

  /**
   * Create a new feature
   */
  async createFeature(applicationId: string, feature: FeatureDefinitionCreateModel): Promise<FeatureDefinition> {
    tl.debug(`Creating feature: ${feature.featureKey}`);
    return await this.makeRequest<FeatureDefinition>(
      'POST',
      `/applications/${applicationId}/features`,
      feature
    );
  }

  /**
   * Update an existing feature
   */
  async updateFeature(
    applicationId: string,
    featureKey: string,
    feature: Partial<FeatureDefinition>
  ): Promise<FeatureDefinition> {
    tl.debug(`Updating feature: ${featureKey}`);
    return await this.makeRequest<FeatureDefinition>(
      'PUT',
      `/applications/${applicationId}/features/${featureKey}`,
      feature
    );
  }

  /**
   * Update feature environment configuration
   */
  async updateFeatureEnvironment(
    applicationId: string,
    environment: string,
    featureKey: string,
    filters: FeatureFilter[]
  ): Promise<FeatureFilter[]> {
    tl.debug(`Updating feature environment: ${featureKey} in ${environment}`);
    return await this.makeRequest<FeatureFilter[]>(
      'PUT',
      `/applications/${applicationId}/environments/${environment}/features/${featureKey}`,
      { filters }
    );
  }

  /**
   * Get gate status for a release
   */
  async getGateStatus(releaseId: string): Promise<GateStatusResponse> {
    tl.debug(`Getting gate status for release: ${releaseId}`);
    return await this.makeRequest<GateStatusResponse>('GET', `/releases/${releaseId}/gates/status`);
  }

  /**
   * Activate a release
   */
  async activateRelease(releaseId: string): Promise<ReleaseDetails> {
    tl.debug(`Activating release: ${releaseId}`);
    return await this.makeRequest<ReleaseDetails>('POST', `/releases/${releaseId}/activate`);
  }

  /**
   * Rollback a release
   */
  async rollbackRelease(releaseId: string): Promise<ReleaseDetails> {
    tl.debug(`Rolling back release: ${releaseId}`);
    return await this.makeRequest<ReleaseDetails>('POST', `/releases/${releaseId}/rollback`);
  }

  /**
   * Notify deployment event
   */
  async notifyDeploymentEvent(
    releaseId: string,
    eventType: 'deployment_started' | 'deployment_completed' | 'deployment_failed',
    provider: string,
    environment: string,
    metadata?: Record<string, any>
  ): Promise<GateStatusResponse> {
    tl.debug(`Notifying deployment event: ${eventType} for release ${releaseId}`);
    return await this.makeRequest<GateStatusResponse>(
      'POST',
      `/releases/${releaseId}/events`,
      {
        eventType,
        provider,
        environment,
        metadata
      }
    );
  }
}

