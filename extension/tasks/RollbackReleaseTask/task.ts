import * as tl from 'azure-pipelines-task-lib/task';
import { getTogglyConfig, validateServiceConnection } from '../common/service-connection';
import { TogglyApiClient, requireEnvironment } from '../common/toggly-api';
import { logSection, formatError } from '../common/utils';
import { addReleaseSummary } from '../common/build-summary';

async function run(): Promise<void> {
  try {
    logSection('Toggly - Rollback Release');

    // Get inputs
    const connectedService = tl.getInput('connectedService', true)!;
    const releaseId = tl.getInput('releaseId', false) || tl.getVariable('Toggly.ReleaseId');
    const environment = tl.getInput('environment', true);
    const reason = tl.getInput('reason', false);

    if (!releaseId) {
      throw new Error('Release ID is required. Either provide it explicitly or ensure a previous task has set Toggly.ReleaseId variable.');
    }

    // Fail before any HTTP when environment is missing/blank
    const resolvedEnvironment = requireEnvironment(environment);

    console.log(`Release ID: ${releaseId}`);
    console.log(`Environment: ${resolvedEnvironment}`);
    
    if (reason) {
      console.log(`Reason: ${reason}`);
    }

    // Get Toggly configuration from service connection
    const config = getTogglyConfig(connectedService);
    validateServiceConnection(config);

    // Create API client
    const apiClient = new TogglyApiClient(config);

    // Get release details before rollback
    console.log('');
    console.log('Getting release details...');
    const releaseBefore = await apiClient.getReleaseDetails(releaseId);
    console.log(`Release: ${releaseBefore.name}`);
    console.log(`Status: ${releaseBefore.status}`);

    if (releaseBefore.status !== 'Live') {
      tl.warning(`Release status is '${releaseBefore.status}'. Rollback typically only works for 'Live' releases.`);
    }

    // Rollback release
    console.log('');
    console.log('Rolling back release...');
    const release = await apiClient.rollbackRelease(releaseId, resolvedEnvironment);

    console.log('');
    console.log('✓ Release rolled back successfully!');
    console.log(`  Release ID: ${release.id}`);
    console.log(`  Name: ${release.name}`);
    console.log(`  Status: ${release.status}`);

    if (release.rolledBackAt) {
      console.log(`  Rolled Back At: ${new Date(release.rolledBackAt).toLocaleString()}`);
    }

    // Log feature changes that were reverted
    if (release.featureChanges && release.featureChanges.length > 0) {
      console.log('');
      console.log('Feature flags reverted:');
      for (const change of release.featureChanges) {
        console.log(`  - ${change.flagKey}`);
      }
    }

    // Add release summary to build
    addReleaseSummary(release);

    // Log warning about rollback
    tl.warning('Release has been rolled back. Feature flags have been restored to their previous state.');

    tl.setResult(tl.TaskResult.Succeeded, 'Release rolled back successfully');
  } catch (error) {
    const errorMessage = formatError(error);
    console.error('Failed to rollback release:', errorMessage);
    tl.setResult(tl.TaskResult.Failed, errorMessage);
  }
}

run();
