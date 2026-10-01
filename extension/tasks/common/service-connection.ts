import * as tl from 'azure-pipelines-task-lib/task';
import { TogglyConfig } from './types';

/**
 * Gets Toggly configuration from an Azure DevOps service connection.
 *
 * The endpoint type uses Basic auth with labels Client ID / Client Secret
 * (parameters username / password). Optional Authority is an endpoint data field.
 */
export function getTogglyConfig(serviceConnectionName: string): TogglyConfig {
  const endpointUrl = tl.getEndpointUrl(serviceConnectionName, false);

  // Prefer authorization parameters (Basic scheme stores Client ID/Secret here).
  const clientId =
    tl.getEndpointAuthorizationParameter(serviceConnectionName, 'username', true) ||
    tl.getEndpointAuthorizationParameter(serviceConnectionName, 'clientId', true) ||
    '';
  const clientSecret =
    tl.getEndpointAuthorizationParameter(serviceConnectionName, 'password', true) ||
    tl.getEndpointAuthorizationParameter(serviceConnectionName, 'clientSecret', true) ||
    '';

  let authority = 'https://auth.toggly.io';
  try {
    authority =
      tl.getEndpointDataParameter(serviceConnectionName, 'authority', true) ||
      tl.getEndpointAuthorizationParameter(serviceConnectionName, 'authority', true) ||
      authority;
  } catch {
    // Optional field — keep default when the connection has no data block.
  }

  const baseUrl = endpointUrl || 'https://app.toggly.io/api';

  if (!clientId || !clientSecret) {
    throw new Error(
      'Service connection is missing required OAuth2 credentials (Client ID and Client Secret)'
    );
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
