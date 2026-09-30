import * as tl from 'azure-pipelines-task-lib/task';
import { getTogglyConfig, validateServiceConnection } from '../common/service-connection';
import { TogglyApiClient } from '../common/toggly-api';
import { AssociateBuildRequest } from '../common/types';
import { 
  logSection, 
  formatError, 
  setPipelineVariable, 
  getAzureDevOpsBuildInfo,
  replaceVariables,
  getTogglyReleaseUrl
} from '../common/utils';

async function run(): Promise<void> {
  try {
    logSection('Toggly - Associate Build');

    // Get inputs
    const connectedService = tl.getInput('connectedService', true)!;
    const projectKey = tl.getInput('projectKey', true)!;
    const environment = tl.getInput('environment', true)!;
    const mode = tl.getInput('mode', true)!;
    const releaseTemplateKey = tl.getInput('releaseTemplateKey', false);
    const namePattern = tl.getInput('namePattern', false);

    console.log(`Project Key: ${projectKey}`);
    console.log(`Environment: ${environment}`);
    console.log(`Mode: ${mode}`);

    // Get Toggly configuration from service connection
    const config = getTogglyConfig(connectedService);
    validateServiceConnection(config);

    // Get Azure DevOps build information
    const buildInfo = getAzureDevOpsBuildInfo();
    
    console.log('');
    console.log('Build Information:');
    console.log(`  Pipeline: ${buildInfo.pipelineName}`);
    console.log(`  Build ID: ${buildInfo.runId}`);
    if (buildInfo.branch) {
      console.log(`  Branch: ${buildInfo.branch}`);
    }
    if (buildInfo.commitSha) {
      console.log(`  Commit: ${buildInfo.commitSha.substring(0, 8)}`);
    }
    if (buildInfo.buildNumber) {
      console.log(`  Build Number: ${buildInfo.buildNumber}`);
    }

    // Create API client
    const apiClient = new TogglyApiClient(config);

    // Build request
    const request: AssociateBuildRequest = {
      projectKey,
      environment,
      ciProvider: 'azure-devops',
      build: buildInfo,
      mode,
      releaseTemplateKey: releaseTemplateKey || undefined,
      matchCriteria: {
        byBranch: true
      }
    };

    // Add name pattern if provided
    if (namePattern) {
      const processedPattern = replaceVariables(namePattern, {
        branch: buildInfo.branch || '',
        buildNumber: buildInfo.buildNumber || '',
        commitSha: buildInfo.commitSha || ''
      });
      
      request.createOptions = {
        namePattern: processedPattern
      };
      
      console.log(`Release Name Pattern: ${processedPattern}`);
    }

    // Associate build
    console.log('');
    console.log('Associating build with release...');
    const response = await apiClient.associateBuild(request);

    console.log('');
    console.log('✓ Build associated successfully!');
    console.log(`  Release ID: ${response.releaseId}`);

    // Set output variables
    setPipelineVariable('Toggly.ReleaseId', response.releaseId);
    
    const releaseUrl = response.releaseUrl || getTogglyReleaseUrl(response.releaseId, config.baseUrl);
    setPipelineVariable('Toggly.ReleaseUrl', releaseUrl);

    console.log('');
    console.log(`View release: ${releaseUrl}`);

    tl.setResult(tl.TaskResult.Succeeded, 'Build associated successfully');
  } catch (error) {
    const errorMessage = formatError(error);
    console.error('Failed to associate build:', errorMessage);
    tl.setResult(tl.TaskResult.Failed, errorMessage);
  }
}

run();

