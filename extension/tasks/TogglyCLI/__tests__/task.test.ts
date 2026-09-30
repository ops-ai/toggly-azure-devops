import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const mockSetSecret = jest.fn();
const mockGetInput = jest.fn();
const mockSetResult = jest.fn();
const mockGetVariable = jest.fn();
const mockWhich = jest.fn();
const mockDebug = jest.fn();
const mockError = jest.fn();

jest.mock('azure-pipelines-task-lib/task', () => ({
  getInput: (...args: unknown[]) => mockGetInput(...args),
  setSecret: (...args: unknown[]) => mockSetSecret(...args),
  setResult: (...args: unknown[]) => mockSetResult(...args),
  getVariable: (...args: unknown[]) => mockGetVariable(...args),
  which: (...args: unknown[]) => mockWhich(...args),
  debug: (...args: unknown[]) => mockDebug(...args),
  error: (...args: unknown[]) => mockError(...args),
  TaskResult: {
    Succeeded: 0,
    Failed: 1
  }
}));

const mockSpawnSync = jest.fn();

jest.mock('child_process', () => ({
  spawnSync: (...args: unknown[]) => mockSpawnSync(...args)
}));

import { run } from '../task';

describe('TogglyCLI task', () => {
  const secret = 'super-secret-value-do-not-log';
  const clientId = 'client-id-value';
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    mockGetVariable.mockImplementation((name: string) => {
      if (name === 'Agent.TempDirectory') {
        return '/tmp/agent';
      }
      return undefined;
    });
    mockWhich.mockImplementation((tool: string) => {
      if (tool === 'python3') {
        return '/usr/bin/python3';
      }
      return '';
    });
    mockSpawnSync.mockReturnValue({ status: 0, error: undefined });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  function stubValidInputs(overrides: Record<string, string | undefined> = {}): void {
    const inputs: Record<string, string | undefined> = {
      version: '0.2.1',
      args: 'associate-build --project-key my-app',
      clientId,
      clientSecret: secret,
      baseUrl: undefined,
      authority: undefined,
      ...overrides
    };
    mockGetInput.mockImplementation((name: string) => inputs[name]);
  }

  function allLoggedText(): string {
    const fromConsole = [...consoleLogSpy.mock.calls, ...consoleErrorSpy.mock.calls]
      .map((args) => args.map(String).join(' '))
      .join('\n');
    const fromTl = [...mockDebug.mock.calls, ...mockError.mock.calls]
      .map((args) => args.map(String).join(' '))
      .join('\n');
    const fromResult = mockSetResult.mock.calls.map((args) => args.map(String).join(' ')).join('\n');
    return `${fromConsole}\n${fromTl}\n${fromResult}`;
  }

  it('marks the client secret with setSecret and never logs it', async () => {
    stubValidInputs();

    await run();

    expect(mockSetSecret).toHaveBeenCalledWith(secret);
    expect(allLoggedText()).not.toContain(secret);
    expect(allLoggedText()).not.toContain(clientId);
    expect(allLoggedText()).not.toContain('associate-build --project-key my-app');
  });

  it('fails before spawn when args is empty', async () => {
    stubValidInputs({ args: '   ' });

    await run();

    expect(mockSpawnSync).not.toHaveBeenCalled();
    expect(mockSetResult).toHaveBeenCalledWith(
      1,
      expect.stringMatching(/args/i)
    );
  });

  it('fails before spawn when version is invalid', async () => {
    stubValidInputs({ version: 'latest' });

    await run();

    expect(mockSpawnSync).not.toHaveBeenCalled();
    expect(mockSetResult).toHaveBeenCalledWith(
      1,
      expect.stringMatching(/MAJOR\.MINOR\.PATCH|version/i)
    );
  });

  it('fails before spawn when version looks like a path', async () => {
    stubValidInputs({ version: '../evil' });

    await run();

    expect(mockSpawnSync).not.toHaveBeenCalled();
    expect(mockSetResult).toHaveBeenCalledWith(
      1,
      expect.stringMatching(/MAJOR\.MINOR\.PATCH|version/i)
    );
  });

  it('propagates a non-zero python exit code as the task result', async () => {
    stubValidInputs();
    mockSpawnSync
      .mockReturnValueOnce({ status: 0, error: undefined })
      .mockReturnValueOnce({ status: 2, error: undefined });

    const code = await run();

    expect(code).toBe(2);
    expect(mockSetResult).toHaveBeenCalledWith(1, expect.any(String));
    expect(mockSpawnSync).toHaveBeenCalledTimes(2);
  });

  it('runs install then run with env mapped from inputs', async () => {
    stubValidInputs({
      baseUrl: 'https://example.test/api',
      authority: 'https://auth.example.test'
    });

    await run();

    expect(mockSpawnSync).toHaveBeenCalledTimes(2);
    const installCall = mockSpawnSync.mock.calls[0];
    const runCall = mockSpawnSync.mock.calls[1];
    expect(installCall[0]).toBe('/usr/bin/python3');
    expect(installCall[1][1]).toBe('install');
    expect(runCall[1][1]).toBe('run');

    const installEnv = installCall[2].env as NodeJS.ProcessEnv;
    expect(installEnv.TOGGLY_CLI_VERSION).toBe('0.2.1');
    expect(installEnv.TOGGLY_CLIENT_ID).toBe(clientId);
    expect(installEnv.TOGGLY_CLIENT_SECRET).toBe(secret);
    expect(installEnv.TOGGLY_ARGS).toBe('associate-build --project-key my-app');
    expect(installEnv.TOGGLY_BASE_URL).toBe('https://example.test/api');
    expect(installEnv.TOGGLY_AUTHORITY).toBe('https://auth.example.test');
    expect(installEnv.TOGGLY_INSTALL_DIR).toBe(
      path.join('/tmp/agent', 'toggly', '0.2.1')
    );
  });
});

describe('vendored toggly_action.py', () => {
  it('sha256 file matches the vendored script', () => {
    const vendored = path.join(__dirname, '..', 'toggly_action.py');
    const digestFile = path.join(__dirname, '..', 'toggly_action.py.sha256');

    expect(fs.existsSync(vendored)).toBe(true);
    expect(fs.existsSync(digestFile)).toBe(true);

    const vendoredBytes = fs.readFileSync(vendored);
    const actual = crypto.createHash('sha256').update(vendoredBytes).digest('hex');
    const recorded = fs.readFileSync(digestFile, 'utf8').trim();
    expect(actual).toBe(recorded);
  });

  it('matches sibling toggly-action when that repo is checked out', () => {
    const vendored = path.join(__dirname, '..', 'toggly_action.py');
    const source = path.resolve(
      __dirname,
      '../../../../../toggly-action/scripts/toggly_action.py'
    );

    if (!fs.existsSync(source)) {
      // CI clones only this repo; local workspaces often have toggly-action next door.
      return;
    }

    const vendoredBytes = fs.readFileSync(vendored);
    const sourceBytes = fs.readFileSync(source);
    expect(vendoredBytes.equals(sourceBytes)).toBe(true);
  });
});
