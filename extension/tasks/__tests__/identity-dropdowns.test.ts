import * as fs from 'fs';
import * as path from 'path';

const tasksRoot = path.resolve(__dirname, '..');
const extensionRoot = path.resolve(__dirname, '..', '..');

function readTask(name: string): any {
  return JSON.parse(fs.readFileSync(path.join(tasksRoot, name, 'task.json'), 'utf8'));
}

describe('typed task identity dropdowns', () => {
  const typedTasks = [
    'ActivateReleaseTask',
    'RollbackReleaseTask',
    'CreateReleaseTask',
    'AssociateBuildTask',
    'CreateFeatureTask',
    'UpdateFeatureTask',
    'UpdateFeatureEnvTask'
  ];

  it('every typed task has workspace pickList with type-in enabled', () => {
    for (const name of typedTasks) {
      const task = readTask(name);
      const teamId = task.inputs.find((i: { name: string }) => i.name === 'teamId');
      expect(teamId).toBeDefined();
      expect(teamId.type).toBe('pickList');
      expect(teamId.required).toBe(false);
      expect(teamId.properties.EditableOptions).toBe('True');
      const binding = task.dataSourceBindings.find((b: { target: string }) => b.target === 'teamId');
      expect(binding.dataSourceName).toBe('TogglyWorkspaces');
      expect(binding.endpointId).toBe('$(connectedService)');
    }
  });

  it('application fields bind to TogglyApplications and allow typing', () => {
    const appTasks = [
      ['ActivateReleaseTask', 'applicationId'],
      ['RollbackReleaseTask', 'applicationId'],
      ['CreateReleaseTask', 'applicationId'],
      ['AssociateBuildTask', 'projectKey'],
      ['CreateFeatureTask', 'applicationId'],
      ['UpdateFeatureTask', 'applicationId'],
      ['UpdateFeatureEnvTask', 'applicationId']
    ] as const;

    for (const [name, field] of appTasks) {
      const task = readTask(name);
      const input = task.inputs.find((i: { name: string }) => i.name === field);
      expect(input.type).toBe('pickList');
      expect(input.properties.EditableOptions).toBe('True');
      const binding = task.dataSourceBindings.find((b: { target: string }) => b.target === field);
      expect(binding.dataSourceName).toBe('TogglyApplications');
    }
  });

  it('environment fields bind to TogglyEnvironments without hardcoded names', () => {
    const envTasks = [
      ['ActivateReleaseTask', 'applicationId'],
      ['RollbackReleaseTask', 'applicationId'],
      ['AssociateBuildTask', 'projectKey'],
      ['UpdateFeatureEnvTask', 'applicationId']
    ] as const;

    for (const [name, appField] of envTasks) {
      const task = readTask(name);
      const env = task.inputs.find((i: { name: string }) => i.name === 'environment');
      expect(env.type).toBe('pickList');
      expect(env.options).toBeUndefined();
      expect(env.properties.EditableOptions).toBe('True');
      const binding = task.dataSourceBindings.find((b: { target: string }) => b.target === 'environment');
      expect(binding.dataSourceName).toBe('TogglyEnvironments');
      expect(binding.parameters.applicationId).toBe(`$(${appField})`);
    }
  });

  it('CLI task is unchanged (no service-connection dropdowns)', () => {
    const task = readTask('TogglyCLI');
    expect(task.dataSourceBindings).toBeUndefined();
    expect(task.inputs.find((i: { name: string }) => i.name === 'teamId')).toBeUndefined();
  });
});

describe('service endpoint data sources', () => {
  it('declares workspace, application, and environment sources', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(extensionRoot, 'vss-extension.json'), 'utf8')
    );
    const endpoint = manifest.contributions.find((c: { id: string }) => c.id === 'toggly-service-endpoint');
    const names = endpoint.properties.dataSources.map((d: { name: string }) => d.name);
    expect(names).toEqual(
      expect.arrayContaining(['TestConnection', 'TogglyWorkspaces', 'TogglyApplications', 'TogglyEnvironments'])
    );
  });
});
