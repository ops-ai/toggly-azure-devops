import * as tl from 'azure-pipelines-task-lib/task';
import { BuildInfo } from './types';

/**
 * Get Azure DevOps build information
 */
export function getAzureDevOpsBuildInfo(): BuildInfo {
  const buildId = tl.getVariable('Build.BuildId') || '';
  const collectionUri = tl.getVariable('System.CollectionUri') || '';
  const teamProject = tl.getVariable('System.TeamProject') || '';
  const pipelineName = tl.getVariable('Build.DefinitionName') || '';
  const branch = tl.getVariable('Build.SourceBranchName') || '';
  const commitSha = tl.getVariable('Build.SourceVersion') || '';
  const buildNumber = tl.getVariable('Build.BuildNumber') || '';

  const runUrl = buildId && collectionUri && teamProject
    ? `${collectionUri}${teamProject}/_build/results?buildId=${buildId}`
    : undefined;

  return {
    runId: buildId,
    runUrl,
    pipelineName,
    branch: branch || undefined,
    commitSha: commitSha || undefined,
    buildNumber: buildNumber || undefined
  };
}

/**
 * Replace variables in a string with values
 */
export function replaceVariables(pattern: string, variables: Record<string, string>): string {
  let result = pattern;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}

/**
 * Format error message for display
 */
export function formatError(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return JSON.stringify(error);
}

/**
 * Set pipeline variable
 */
export function setPipelineVariable(name: string, value: string, isSecret: boolean = false): void {
  tl.setVariable(name, value, isSecret);
  console.log(`##vso[task.setvariable variable=${name};isSecret=${isSecret}]${value}`);
}

/**
 * Log a section header
 */
export function logSection(title: string): void {
  console.log('');
  console.log('='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
  console.log('');
}

/**
 * Format release URL for Toggly
 */
export function getTogglyReleaseUrl(releaseId: string, baseUrl: string): string {
  const webUrl = baseUrl.replace('/api', '');
  return `${webUrl}/releases/${releaseId}`;
}

/**
 * Parse JSON with error handling
 */
export function parseJsonSafe<T>(json: string, fieldName: string): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    throw new Error(`Failed to parse ${fieldName}: ${formatError(error)}`);
  }
}

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate string to max length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

