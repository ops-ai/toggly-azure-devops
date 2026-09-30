import * as tl from 'azure-pipelines-task-lib/task';
import { getTogglyConfig, validateServiceConnection } from '../common/service-connection';
import { TogglyApiClient } from '../common/toggly-api';
import { FeatureFilter } from '../common/types';
import { logSection, formatError, parseJsonSafe } from '../common/utils';

async function run(): Promise<void> {
  try {
    logSection('Toggly - Update Feature Environment');

    // Get inputs
    const connectedService = tl.getInput('connectedService', true)!;
    const applicationId = tl.getInput('applicationId', true)!;
    const environment = tl.getInput('environment', true)!;
    const featureKey = tl.getInput('featureKey', true)!;
    const action = tl.getInput('action', true)!;
    const filtersJson = tl.getInput('filters', false);

    console.log(`Application ID: ${applicationId}`);
    console.log(`Environment: ${environment}`);
    console.log(`Feature Key: ${featureKey}`);
    console.log(`Action: ${action}`);

    // Get Toggly configuration from service connection
    const config = getTogglyConfig(connectedService);
    validateServiceConnection(config);

    // Create API client
    const apiClient = new TogglyApiClient(config);

    // Determine filters based on action
    let filters: FeatureFilter[];

    switch (action) {
      case 'enable':
        filters = [{
          name: 'AlwaysOn',
          parameters: {}
        }];
        console.log('Enabling feature (AlwaysOn)');
        break;

      case 'disable':
        filters = [];
        console.log('Disabling feature (removing all filters)');
        break;

      case 'custom':
        if (!filtersJson) {
          throw new Error('Custom filters JSON is required when action is "custom"');
        }
        filters = parseJsonSafe<FeatureFilter[]>(filtersJson, 'filters');
        console.log(`Custom filters: ${filters.length} filter(s)`);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Update feature environment
    console.log('');
    console.log('Updating feature environment...');
    const result = await apiClient.updateFeatureEnvironment(
      applicationId,
      environment,
      featureKey,
      filters
    );

    console.log('');
    console.log('✓ Feature environment updated successfully!');
    console.log(`  Applied filters: ${result.length}`);
    
    if (result.length > 0) {
      console.log('  Filters:');
      for (const filter of result) {
        console.log(`    - ${filter.name}`);
      }
    }

    tl.setResult(tl.TaskResult.Succeeded, 'Feature environment updated successfully');
  } catch (error) {
    const errorMessage = formatError(error);
    console.error('Failed to update feature environment:', errorMessage);
    tl.setResult(tl.TaskResult.Failed, errorMessage);
  }
}

run();

