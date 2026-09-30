import * as path from 'path';
import * as fs from 'fs';
import { spawnSync, SpawnSyncReturns } from 'child_process';
import * as tl from 'azure-pipelines-task-lib/task';

const VERSION_RE = /^\d+\.\d+\.\d+$/;

function validateVersion(version: string): void {
  if (!version || !VERSION_RE.test(version)) {
    throw new Error(`version must be MAJOR.MINOR.PATCH (got ${JSON.stringify(version)})`);
  }
}

function validateArgs(args: string): void {
  if (!args || !args.trim()) {
    throw new Error('args is required and must not be empty');
  }
}

function resolvePython(): string {
  const python3 = tl.which('python3', false);
  if (python3) {
    return python3;
  }
  const python = tl.which('python', false);
  if (python) {
    return python;
  }
  throw new Error('python3 or python is required on the agent PATH');
}

function buildEnv(params: {
  version: string;
  args: string;
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  authority?: string;
  installDir: string;
}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    TOGGLY_CLI_VERSION: params.version,
    TOGGLY_ARGS: params.args,
    TOGGLY_CLIENT_ID: params.clientId,
    TOGGLY_CLIENT_SECRET: params.clientSecret,
    TOGGLY_INSTALL_DIR: params.installDir
  };

  if (params.baseUrl) {
    env.TOGGLY_BASE_URL = params.baseUrl;
  }
  if (params.authority) {
    env.TOGGLY_AUTHORITY = params.authority;
  }

  return env;
}

function findInstalledBinary(installDir: string): string | undefined {
  if (!fs.existsSync(installDir)) {
    return undefined;
  }

  const names = ['toggly-cli', 'toggly-cli.exe'];
  const stack = [installDir];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && names.includes(entry.name)) {
        return full;
      }
    }
  }
  return undefined;
}

function runPython(
  python: string,
  scriptPath: string,
  command: 'install' | 'run',
  env: NodeJS.ProcessEnv
): number {
  const result: SpawnSyncReturns<Buffer> = spawnSync(python, [scriptPath, command], {
    env,
    stdio: 'inherit'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status === null) {
    throw new Error(`python ${command} terminated by signal ${result.signal ?? 'unknown'}`);
  }

  return result.status;
}

/**
 * Azure Pipelines task entrypoint. Installs a pinned toggly-cli and runs args.
 * Does not log args, client id, or client secret.
 */
export async function run(): Promise<number> {
  try {
    const clientSecret = tl.getInput('clientSecret', true) || '';
    tl.setSecret(clientSecret);

    const version = tl.getInput('version', true) || '';
    const args = tl.getInput('args', true) || '';
    const clientId = tl.getInput('clientId', true) || '';
    const baseUrl = tl.getInput('baseUrl', false) || undefined;
    const authority = tl.getInput('authority', false) || undefined;

    validateVersion(version);
    validateArgs(args);

    const agentTemp = tl.getVariable('Agent.TempDirectory') || process.env.TMPDIR || '/tmp';
    const installDir = path.join(agentTemp, 'toggly', version);
    const scriptPath = path.join(__dirname, 'toggly_action.py');
    const python = resolvePython();

    const env = buildEnv({
      version,
      args,
      clientId,
      clientSecret,
      baseUrl,
      authority,
      installDir
    });

    console.log(`Toggly CLI ${version}: installing`);
    const installCode = runPython(python, scriptPath, 'install', env);
    if (installCode !== 0) {
      tl.setResult(tl.TaskResult.Failed, `toggly_action.py install exited with code ${installCode}`);
      return installCode;
    }

    const binary = findInstalledBinary(installDir);
    if (binary) {
      env.TOGGLY_BIN = binary;
    }

    console.log(`Toggly CLI ${version}: running`);
    const runCode = runPython(python, scriptPath, 'run', env);
    if (runCode !== 0) {
      tl.setResult(tl.TaskResult.Failed, `toggly_action.py run exited with code ${runCode}`);
      return runCode;
    }

    tl.setResult(tl.TaskResult.Succeeded, 'Toggly CLI completed successfully');
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Toggly CLI task failed');
    tl.setResult(tl.TaskResult.Failed, message);
    return 1;
  }
}

if (require.main === module) {
  void run();
}
