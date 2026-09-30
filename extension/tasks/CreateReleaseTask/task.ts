import * as tl from 'azure-pipelines-task-lib/task';
import { getTogglyConfig, validateServiceConnection } from '../common/service-connection';
import { TogglyApiClient } from '../common/toggly-api';
import { CreateReleaseRequest, FeatureChangeRequest } from '../common/types';
import { logSection, formatError, setPipelineVariable, parseJsonSafe, getTogglyReleaseUrl } from '../common/utils';

async function run(): Promise<void> {
  try {
    logSection('Toggly - Create Release');

    // Get inputs
    const connectedService = tl.getInput('connectedService', true)!;
    const applicationId = tl.getInput('applicationId', true)!;
    const releaseName = tl.getInput('releaseName', true)!;
    const releaseNotes = tl.getInput('releaseNotes', false);
    const featureChangesJson = tl.getInput('featureChanges', false);

    console.log(`Application ID: ${applicationId}`);
    console.log(`Release Name: ${releaseName}`);

    // Get Toggly configuration from service connection
    const config = getTogglyConfig(connectedService);
    validateServiceConnection(config);

    // Create API client
    const apiClient = new TogglyApiClient(config);

    // Build request
    const request: CreateReleaseRequest = {
      applicationId,
      name: releaseName,
      releaseNotes: releaseNotes || undefined
    };

    // Parse feature changes if provided
    if (featureChangesJson) {
      console.log('Parsing feature changes...');
      request.featureChanges = parseJsonSafe<FeatureChangeRequest[]>(
        featureChangesJson,
        'feature changes'
      );
      console.log(`Feature changes: ${request.featureChanges.length} changes`);
    }

    // Create release
    console.log('Creating release...');
    const release = await apiClient.createRelease(request);

    console.log('');
    console.log('✓ Release created successfully!');
    console.log(`  Release ID: ${release.id}`);
    console.log(`  Name: ${release.name}`);
    console.log(`  Status: ${release.status}`);

    if (release.releaseNotes) {
      console.log(`  Release Notes: ${release.releaseNotes.substring(0, 100)}...`);
    }

    // Set output variables
    setPipelineVariable('Toggly.ReleaseId', release.id);
    
    const releaseUrl = getTogglyReleaseUrl(release.id, config.baseUrl);
    setPipelineVariable('Toggly.ReleaseUrl', releaseUrl);

    console.log('');
    console.log(`View release: ${releaseUrl}`);

    tl.setResult(tl.TaskResult.Succeeded, 'Release created successfully');
  } catch (error) {
    const errorMessage = formatError(error);
    console.error('Failed to create release:', errorMessage);
    tl.setResult(tl.TaskResult.Failed, errorMessage);
  }
}

run();

