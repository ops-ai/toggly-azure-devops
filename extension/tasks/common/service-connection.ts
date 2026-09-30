import * as tl from 'azure-pipelines-task-lib/task';
import { TogglyConfig } from './types';

/**
 * Gets Toggly configuration from Azure DevOps Service Connection
 */
export function getTogglyConfig(serviceConnectionName: string): TogglyConfig {
  const endpointAuth = tl.getEndpointAuthorization(serviceConnectionName, false);
  const endpointUrl = tl.getEndpointUrl(serviceConnectionName, false);

  if (!endpointAuth) {
    throw new Error(`Service connection '${serviceConnectionName}' not found or not authorized`);
  }

  const clientId = endpointAuth.parameters['clientId'];
  const clientSecret = endpointAuth.parameters['clientSecret'];
  const authority = endpointAuth.parameters['authority'] || 'https://auth.toggly.io';
  const baseUrl = endpointUrl || 'https://app.toggly.io/api';

  if (!clientId || !clientSecret) {
    throw new Error('Service connection is missing required OAuth2 credentials (Client ID and Client Secret)');
  }

  return {
    baseUrl,
    clientId,
    clientSecret,
    authority
  };
}

/**
 * Validates that the service connection is properly configured
 */
export function validateServiceConnection(config: TogglyConfig): void {
  if (!config.baseUrl) {
    throw new Error('Base URL is not configured');
  }
  if (!config.clientId) {
    throw new Error('Client ID is not configured');
  }
  if (!config.clientSecret) {
    throw new Error('Client Secret is not configured');
  }
  if (!config.authority) {
    throw new Error('Authority URL is not configured');
  }
}

