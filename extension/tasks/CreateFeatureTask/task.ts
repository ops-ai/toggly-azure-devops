import * as tl from 'azure-pipelines-task-lib/task';
import { getTogglyConfig, validateServiceConnection } from '../common/service-connection';
import { TogglyApiClient } from '../common/toggly-api';
import { FeatureDefinitionCreateModel } from '../common/types';
import { logSection, formatError, setPipelineVariable } from '../common/utils';

async function run(): Promise<void> {
  try {
    logSection('Toggly - Create Feature');

    // Get inputs
    const connectedService = tl.getInput('connectedService', true)!;
    const applicationId = tl.getInput('applicationId', true)!;
    const featureName = tl.getInput('featureName', true)!;
    const featureKey = tl.getInput('featureKey', true)!;
    const description = tl.getInput('description', false);
    const category = tl.getInput('category', false);
    const tagsInput = tl.getInput('tags', false);

    console.log(`Application ID: ${applicationId}`);
    console.log(`Feature Name: ${featureName}`);
    console.log(`Feature Key: ${featureKey}`);

    // Get Toggly configuration from service connection
    const config = getTogglyConfig(connectedService);
    validateServiceConnection(config);

    // Create API client
    const apiClient = new TogglyApiClient(config);

    // Build feature model
    const feature: FeatureDefinitionCreateModel = {
      name: featureName,
      featureKey: featureKey,
      description: description || undefined,
      category: category || undefined
    };

    // Parse tags if provided
    if (tagsInput) {
      feature.tags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
      console.log(`Tags: ${feature.tags.join(', ')}`);
    }

    // Create feature
    console.log('');
    console.log('Creating feature...');
    const result = await apiClient.createFeature(applicationId, feature);

    console.log('');
    console.log('✓ Feature created successfully!');
    console.log(`  Feature Key: ${result.featureKey}`);
    console.log(`  Name: ${result.name}`);

    if (result.description) {
      console.log(`  Description: ${result.description.substring(0, 100)}...`);
    }

    // Set output variable
    setPipelineVariable('Toggly.FeatureKey', result.featureKey);

    tl.setResult(tl.TaskResult.Succeeded, 'Feature created successfully');
  } catch (error) {
    const errorMessage = formatError(error);
    console.error('Failed to create feature:', errorMessage);
    tl.setResult(tl.TaskResult.Failed, errorMessage);
  }
}

run();

