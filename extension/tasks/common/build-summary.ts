import * as tl from 'azure-pipelines-task-lib/task';
import { ReleaseDetails, GateStatusResponse } from './types';

/**
 * Add release information to Azure DevOps build summary
 */
export function addReleaseSummary(release: ReleaseDetails): void {
  const markdown = generateReleaseSummaryMarkdown(release);
  
  // Write summary to a temporary file
  const summaryFile = tl.getVariable('Agent.TempDirectory') + '/toggly-release-summary.md';
  tl.writeFile(summaryFile, markdown);
  
  // Add to build summary
  console.log(`##vso[task.uploadsummary]${summaryFile}`);
  
  tl.debug('Release summary added to build');
}

/**
 * Generate markdown for release summary
 */
function generateReleaseSummaryMarkdown(release: ReleaseDetails): string {
  const lines: string[] = [];
  
  lines.push('# Toggly Release');
  lines.push('');
  
  // Basic information
  lines.push('## Release Information');
  lines.push('');
  lines.push(`**Name:** ${release.name}`);
  lines.push(`**Status:** ${getStatusBadge(release.status)}`);
  lines.push(`**Environment:** ${release.environment}`);
  
  if (release.releaseNotes) {
    lines.push('');
    lines.push('**Release Notes:**');
    lines.push('');
    lines.push(release.releaseNotes);
  }
  
  // Feature changes
  if (release.featureChanges && release.featureChanges.length > 0) {
    lines.push('');
    lines.push('## Feature Changes');
    lines.push('');
    lines.push('| Feature Key | To State |');
    lines.push('|-------------|----------|');
    
    for (const change of release.featureChanges) {
      const toStateStr = change.toState.length > 0 
        ? change.toState.map(f => f.name).join(', ')
        : 'Disabled';
      lines.push(`| \`${change.flagKey}\` | ${toStateStr} |`);
    }
  }
  
  // Gate status
  if (release.gateStatus) {
    lines.push('');
    lines.push('## Gate Status');
    lines.push('');
    lines.push(`**Overall Status:** ${getGateStatusBadge(release.gateStatus.overallStatus)}`);
    
    if (release.gateStatus.gates && release.gateStatus.gates.length > 0) {
      lines.push('');
      lines.push('| Gate | Status | Last Checked |');
      lines.push('|------|--------|--------------|');
      
      for (const gate of release.gateStatus.gates) {
        const lastChecked = gate.lastCheckedAt 
          ? new Date(gate.lastCheckedAt).toLocaleString()
          : 'Not checked';
        lines.push(`| ${gate.name} | ${getGateStatusBadge(gate.status)} | ${lastChecked} |`);
      }
    }
  }
  
  // CI Links
  if (release.ciLinks && release.ciLinks.length > 0) {
    lines.push('');
    lines.push('## CI Links');
    lines.push('');
    
    for (const link of release.ciLinks) {
      lines.push(`- **${link.provider}** - ${link.pipelineName}`);
      if (link.branch) {
        lines.push(`  - Branch: \`${link.branch}\``);
      }
      if (link.commitSha) {
        lines.push(`  - Commit: \`${link.commitSha.substring(0, 8)}\``);
      }
      if (link.buildNumber) {
        lines.push(`  - Build: ${link.buildNumber}`);
      }
    }
  }
  
  lines.push('');
  lines.push('---');
  lines.push(`*Release ID: ${release.id}*`);
  
  return lines.join('\n');
}

/**
 * Get status badge markdown
 */
function getStatusBadge(status: string): string {
  const badges: Record<string, string> = {
    'Draft': '⚪ Draft',
    'Pending': '🟡 Pending',
    'Live': '🟢 Live',
    'RolledBack': '🔴 Rolled Back',
    'Failed': '🔴 Failed'
  };
  return badges[status] || status;
}

/**
 * Get gate status badge
 */
function getGateStatusBadge(status: string): string {
  const badges: Record<string, string> = {
    'pending': '🟡 Pending',
    'passed': '✅ Passed',
    'failed': '❌ Failed'
  };
  return badges[status] || status;
}

/**
 * Add gate status update to build logs
 */
export function logGateStatus(gateStatus: GateStatusResponse): void {
  console.log('');
  console.log('Gate Status:');
  console.log(`  Overall: ${gateStatus.overallStatus}`);
  
  if (gateStatus.gates && gateStatus.gates.length > 0) {
    console.log('  Individual Gates:');
    for (const gate of gateStatus.gates) {
      console.log(`    - ${gate.name}: ${gate.status}`);
    }
  }
}

