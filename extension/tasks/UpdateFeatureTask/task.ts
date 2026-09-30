import * as tl from 'azure-pipelines-task-lib/task';
import { getTogglyConfig, validateServiceConnection } from '../common/service-connection';
import { TogglyApiClient } from '../common/toggly-api';
import { FeatureDefinition } from '../common/types';
import { logSection, formatError } from '../common/utils';

async function run(): Promise<void> {
  try {
    logSection('Toggly - Update Feature');

    // Get inputs
    const connectedService = tl.getInput('connectedService', true)!;
    const applicationId = tl.getInput('applicationId', true)!;
    const featureKey = tl.getInput('featureKey', true)!;
    const featureName = tl.getInput('featureName', false);
    const description = tl.getInput('description', false);
    const category = tl.getInput('category', false);
    const tagsInput = tl.getInput('tags', false);

    console.log(`Application ID: ${applicationId}`);
    console.log(`Feature Key: ${featureKey}`);

    // Get Toggly configuration from service connection
    const config = getTogglyConfig(connectedService);
    validateServiceConnection(config);

    // Create API client
    const apiClient = new TogglyApiClient(config);

    // Build update model (only include fields that are provided)
    const feature: Partial<FeatureDefinition> = {
      featureKey: featureKey
    };

    if (featureName) {
      feature.name = featureName;
      console.log(`New Name: ${featureName}`);
    }

    if (description) {
      feature.description = description;
      console.log(`New Description: ${description.substring(0, 50)}...`);
    }

    if (category) {
      feature.category = category;
      console.log(`New Category: ${category}`);
    }

    // Parse tags if provided
    if (tagsInput) {
      feature.tags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
      console.log(`New Tags: ${feature.tags.join(', ')}`);
    }

    // Update feature
    console.log('');
    console.log('Updating feature...');
    const result = await apiClient.updateFeature(applicationId, featureKey, feature);

    console.log('');
    console.log('✓ Feature updated successfully!');
    console.log(`  Feature Key: ${result.featureKey}`);
    console.log(`  Name: ${result.name}`);

    tl.setResult(tl.TaskResult.Succeeded, 'Feature updated successfully');
  } catch (error) {
    const errorMessage = formatError(error);
    console.error('Failed to update feature:', errorMessage);
    tl.setResult(tl.TaskResult.Failed, errorMessage);
  }
}

run();

