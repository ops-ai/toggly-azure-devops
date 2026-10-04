import * as fs from 'fs';
import * as path from 'path';

const tasksRoot = path.resolve(__dirname, '..');
const extensionRoot = path.resolve(__dirname, '..', '..');

function readTask(name: string): any {
  return JSON.parse(fs.readFileSync(path.join(tasksRoot, name, 'task.json'), 'utf8'));
}

describe('typed task identity fields', () => {
  const typedTasks = [
    'ActivateReleaseTask',
    'RollbackReleaseTask',
    'CreateReleaseTask',
    'AssociateBuildTask',
    'CreateFeatureTask',
    'UpdateFeatureTask',
    'UpdateFeatureEnvTask'
  ];

  it('does not use dataSourceBindings or workspace dropdowns', () => {
    for (const name of typedTasks) {
      const task = readTask(name);
      expect(task.dataSourceBindings).toBeUndefined();
      expect(task.inputs.find((i: { name: string }) => i.name === 'teamId')).toBeUndefined();
    }
  });

  it('application and environment inputs are text fields', () => {
    const cases: Array<[string, string]> = [
      ['CreateReleaseTask', 'applicationId'],
      ['AssociateBuildTask', 'projectKey'],
      ['CreateFeatureTask', 'applicationId'],
      ['UpdateFeatureTask', 'applicationId'],
      ['UpdateFeatureEnvTask', 'applicationId'],
      ['ActivateReleaseTask', 'environment'],
      ['RollbackReleaseTask', 'environment'],
      ['AssociateBuildTask', 'environment'],
      ['UpdateFeatureEnvTask', 'environment']
    ];

    for (const [name, field] of cases) {
      const task = readTask(name);
      const input = task.inputs.find((i: { name: string }) => i.name === field);
      expect(input).toBeDefined();
      expect(input.type).toBe('string');
    }
  });

  it('CLI task is unchanged', () => {
    const task = readTask('TogglyCLI');
    expect(task.dataSourceBindings).toBeUndefined();
    expect(task.inputs.find((i: { name: string }) => i.name === 'teamId')).toBeUndefined();
  });
});

describe('service endpoint', () => {
  it('does not declare catalog dataSources', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(extensionRoot, 'vss-extension.json'), 'utf8')
    );
    const endpoint = manifest.contributions.find((c: { id: string }) => c.id === 'toggly-service-endpoint');
    expect(endpoint.properties.dataSources).toBeUndefined();
  });
});
