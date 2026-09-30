# Toggly Feature Flags for Azure DevOps

Manage feature flags and releases from Azure Pipelines with typed tasks (service connection, output variables, build summary, gate polling, and rollback) plus an optional `TogglyCLI@1` escape hatch for pinned CLI commands.

## Typed pipeline tasks

| Task | Purpose |
| --- | --- |
| `TogglyCreateRelease@1` | Create a release |
| `TogglyAssociateBuild@1` | Associate the current build with a release |
| `TogglyCreateFeature@1` | Create a feature flag |
| `TogglyUpdateFeature@1` | Update feature metadata |
| `TogglyUpdateFeatureEnv@1` | Enable, disable, or configure filters per environment |
| `TogglyActivateRelease@1` | Activate a release (requires `environment`) |
| `TogglyRollbackRelease@1` | Roll back a release (requires `environment`) |

Configure a **Toggly Feature Flags** service connection (OAuth2 client credentials). Default API URL: `https://app.toggly.io/api`.

```yaml
- task: TogglyActivateRelease@1
  inputs:
    connectedService: 'Toggly-Production'
    releaseId: '$(Toggly.ReleaseId)'
    environment: 'Production'
```

See [Azure DevOps Integration](https://docs.toggly.io/integrations/azure-devops) for full examples.

## Task: TogglyCLI@1

Use the CLI task when you need a pinned `toggly-cli` binary for commands outside the typed tasks.

| Input | Required | Notes |
| --- | --- | --- |
| `version` | yes | Exact `MAJOR.MINOR.PATCH` (for example `0.2.1`). Do not use `latest`. |
| `args` | yes | Quote-aware CLI arguments. **Do not put secrets here.** |
| `clientId` | yes | OAuth2 client ID |
| `clientSecret` | yes | OAuth2 client secret (use a secret pipeline variable) |
| `baseUrl` | no | Optional `TOGGLY_BASE_URL` override |
| `authority` | no | Optional `TOGGLY_AUTHORITY` override |

Agents need Python 3 (`python3` or `python`) on `PATH`.

## Secrets

Store credentials as secret pipeline variables and pass them into service connections or CLI task inputs. Never put client secrets in `args`.

```yaml
- task: TogglyCLI@1
  inputs:
    version: "0.2.1"
    clientId: $(TOGGLY_CLIENT_ID)
    clientSecret: $(TOGGLY_CLIENT_SECRET)
    args: >-
      associate-build
      --project-key my-app
      --environment Production
      --ci-provider azure-devops
      --run-id $(Build.BuildId)
      --pipeline-name "$(Build.DefinitionName)"
      --branch $(Build.SourceBranchName)
      --commit-sha $(Build.SourceVersion)
      --build-number $(Build.BuildNumber)
```

## Documentation

Full guide: [docs.toggly.io/integrations/azure-devops](https://docs.toggly.io/integrations/azure-devops)
