import * as tl from 'azure-pipelines-task-lib/task';
import { getTogglyConfig, validateServiceConnection } from '../common/service-connection';
import { TogglyApiClient, requireEnvironment } from '../common/toggly-api';
import { logSection, formatError, wait } from '../common/utils';
import { addReleaseSummary, logGateStatus } from '../common/build-summary';

async function run(): Promise<void> {
  try {
    logSection('Toggly - Activate Release');

    // Get inputs
    const connectedService = tl.getInput('connectedService', true)!;
    const releaseId = tl.getInput('releaseId', false) || tl.getVariable('Toggly.ReleaseId');
    const environment = tl.getInput('environment', true);
    const waitForGates = tl.getBoolInput('waitForGates', false);
    const gateTimeoutStr = tl.getInput('gateTimeout', false) || '300';
    const gatePollIntervalStr = tl.getInput('gatePollInterval', false) || '10';

    if (!releaseId) {
      throw new Error('Release ID is required. Either provide it explicitly or ensure a previous task has set Toggly.ReleaseId variable.');
    }

    // Fail before any HTTP when environment is missing/blank
    const resolvedEnvironment = requireEnvironment(environment);

    const gateTimeout = parseInt(gateTimeoutStr, 10);
    const gatePollInterval = parseInt(gatePollIntervalStr, 10);

    console.log(`Release ID: ${releaseId}`);
    console.log(`Environment: ${resolvedEnvironment}`);
    console.log(`Wait for Gates: ${waitForGates}`);

    // Get Toggly configuration from service connection
    const config = getTogglyConfig(connectedService);
    validateServiceConnection(config);

    // Create API client
    const apiClient = new TogglyApiClient(config);

    // Wait for gates if requested
    if (waitForGates) {
      console.log('');
      console.log(`Waiting for gates to pass (timeout: ${gateTimeout}s, poll interval: ${gatePollInterval}s)...`);
      
      const startTime = Date.now();
      let gateStatus = await apiClient.getGateStatus(releaseId);
      logGateStatus(gateStatus);

      while (gateStatus.overallStatus === 'pending') {
        const elapsedTime = (Date.now() - startTime) / 1000;
        
        if (elapsedTime >= gateTimeout) {
          throw new Error(`Gate timeout exceeded (${gateTimeout}s). Gates are still pending.`);
        }

        console.log(`Waiting ${gatePollInterval}s before next check...`);
        await wait(gatePollInterval * 1000);

        gateStatus = await apiClient.getGateStatus(releaseId);
        logGateStatus(gateStatus);
      }

      if (gateStatus.overallStatus === 'failed') {
        throw new Error('Gates failed! Cannot activate release.');
      }

      console.log('');
      console.log('✓ All gates passed!');
    }

    // Activate release
    console.log('');
    console.log('Activating release...');
    const release = await apiClient.activateRelease(releaseId, resolvedEnvironment);

    console.log('');
    console.log('✓ Release activated successfully!');
    console.log(`  Release ID: ${release.id}`);
    console.log(`  Name: ${release.name}`);
    console.log(`  Status: ${release.status}`);

    if (release.activatedAt) {
      console.log(`  Activated At: ${new Date(release.activatedAt).toLocaleString()}`);
    }

    // Add release summary to build
    addReleaseSummary(release);

    tl.setResult(tl.TaskResult.Succeeded, 'Release activated successfully');
  } catch (error) {
    const errorMessage = formatError(error);
    console.error('Failed to activate release:', errorMessage);
    tl.setResult(tl.TaskResult.Failed, errorMessage);
  }
}

run();
