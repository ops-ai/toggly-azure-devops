# Toggly Feature Flags for Azure DevOps

Run a **pinned** [Toggly CLI](https://docs.toggly.io/sdks/cli) release in Azure Pipelines. The extension ships one task, `TogglyCLI@1`, which downloads the matching `cli-v*` asset, verifies `SHA256SUMS`, and executes the arguments you supply.

The task does not call the Toggly HTTP API. Authentication uses client credentials mapped to `TOGGLY_CLIENT_ID` and `TOGGLY_CLIENT_SECRET`.

## Task: TogglyCLI@1

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

Store credentials as secret pipeline variables and pass them into the task. Never put client secrets in `args`.

```yaml
variables:
  TOGGLY_CLIENT_ID: $(TOGGLY_CLIENT_ID)
  TOGGLY_CLIENT_SECRET: $(TOGGLY_CLIENT_SECRET)
```

## Recipe 1: Enable a flag after deploy

```yaml
- task: TogglyCLI@1
  inputs:
    version: "0.2.1"
    clientId: $(TOGGLY_CLIENT_ID)
    clientSecret: $(TOGGLY_CLIENT_SECRET)
    args: >-
      update-feature-environment
      --application-id my-app
      --environment Production
      --feature-key my-feature
      --enable
```

Use `--disable` instead of `--enable` to turn the feature off.

## Recipe 2: Create a release

```yaml
- task: TogglyCLI@1
  inputs:
    version: "0.2.1"
    clientId: $(TOGGLY_CLIENT_ID)
    clientSecret: $(TOGGLY_CLIENT_SECRET)
    args: >-
      create-release
      --application-id my-app
      --name "Build $(Build.BuildNumber)"
      --release-notes "Shipped from $(Build.SourceBranchName)"
```

## Recipe 3: Associate the build

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

## Learn more

- [Azure DevOps integration docs](https://docs.toggly.io/integrations/azure-devops)
- [Toggly CLI reference](https://docs.toggly.io/sdks/cli)
- [Support](https://toggly.io/support)
