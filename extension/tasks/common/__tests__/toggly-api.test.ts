jest.mock('azure-pipelines-task-lib/task', () => ({
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  getInput: jest.fn(),
  getVariable: jest.fn(),
  setResult: jest.fn(),
  TaskResult: { Succeeded: 0, Failed: 1 }
}));

const mockRequest = jest.fn();
const mockAxiosPost = jest.fn();

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    __esModule: true,
    default: {
      ...actual,
      create: jest.fn(() => ({
        request: mockRequest,
        interceptors: {
          response: {
            use: jest.fn()
          }
        }
      })),
      post: (...args: unknown[]) => mockAxiosPost(...args)
    }
  };
});

import {
  TogglyApiClient,
  withV2Prefix,
  requireEnvironment
} from '../toggly-api';
import { TogglyConfig } from '../types';

describe('withV2Prefix', () => {
  it('prefixes unversioned paths once', () => {
    expect(withV2Prefix('/releases')).toBe('/v2/releases');
    expect(withV2Prefix('/applications/app/features')).toBe('/v2/applications/app/features');
  });

  it('does not double-prefix paths that already include /v2', () => {
    expect(withV2Prefix('/v2/releases')).toBe('/v2/releases');
    expect(withV2Prefix('/v2')).toBe('/v2');
  });
});

describe('requireEnvironment', () => {
  it('returns trimmed environment', () => {
    expect(requireEnvironment(' Production ')).toBe('Production');
  });

  it('rejects empty environment', () => {
    expect(() => requireEnvironment('')).toThrow('Environment is required');
    expect(() => requireEnvironment('   ')).toThrow('Environment is required');
    expect(() => requireEnvironment(undefined)).toThrow('Environment is required');
  });
});

describe('TogglyApiClient v2 paths', () => {
  const config: TogglyConfig = {
    baseUrl: 'https://app.toggly.io/api',
    clientId: 'client',
    clientSecret: 'secret',
    authority: 'https://auth.toggly.io'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxiosPost.mockResolvedValue({
      data: {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer'
      }
    });
    mockRequest.mockResolvedValue({ data: { id: 'rel-1', name: 'r', status: 'Draft' } });
  });

  function lastRequestUrl(): string {
    expect(mockRequest).toHaveBeenCalled();
    return mockRequest.mock.calls[mockRequest.mock.calls.length - 1][0].url as string;
  }

  it('uses /v2 for create, update, associate, and gate paths', async () => {
    const client = new TogglyApiClient(config);

    await client.createRelease({ name: 'r', applicationId: 'app' } as any);
    expect(lastRequestUrl()).toBe('/v2/releases');

    await client.associateBuild({ projectKey: 'app' } as any);
    expect(lastRequestUrl()).toBe('/v2/releases/associate-build');

    await client.getReleaseDetails('rel-1');
    expect(lastRequestUrl()).toBe('/v2/releases/rel-1');

    await client.getGateStatus('rel-1');
    expect(lastRequestUrl()).toBe('/v2/releases/rel-1/gates/status');

    await client.createFeature('app-1', { featureKey: 'f' } as any);
    expect(lastRequestUrl()).toBe('/v2/applications/app-1/features');

    await client.updateFeature('app-1', 'f', { featureName: 'F' } as any);
    expect(lastRequestUrl()).toBe('/v2/applications/app-1/features/f');

    await client.updateFeatureEnvironment('app-1', 'Production', 'f', []);
    expect(lastRequestUrl()).toBe('/v2/applications/app-1/environments/Production/features/f');
  });

  it('includes encoded environment query on activate and rollback', async () => {
    const client = new TogglyApiClient(config);

    await client.activateRelease('rel-1', 'Prod Staging');
    expect(lastRequestUrl()).toBe('/v2/releases/rel-1/activate?environment=Prod%20Staging');

    await client.rollbackRelease('rel-1', 'Production');
    expect(lastRequestUrl()).toBe('/v2/releases/rel-1/rollback?environment=Production');
  });

  it('does not call HTTP when environment is empty on activate', async () => {
    const client = new TogglyApiClient(config);

    await expect(client.activateRelease('rel-1', '')).rejects.toThrow('Environment is required');
    await expect(client.activateRelease('rel-1', '   ')).rejects.toThrow('Environment is required');
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it('does not call HTTP when environment is empty on rollback', async () => {
    const client = new TogglyApiClient(config);

    await expect(client.rollbackRelease('rel-1', '')).rejects.toThrow('Environment is required');
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });
});
