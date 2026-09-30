# Toggly Azure DevOps Extension

Azure DevOps extension for managing Toggly feature flags in Build and Release pipelines.

## Overview

This extension provides custom pipeline tasks that enable you to:

- Create and manage releases with feature flag changes
- Associate builds with releases for complete traceability
- Create and update feature flags
- Configure feature flags per environment
- Activate releases with automated quality gates
- Automatically roll back features on deployment failures
- Display rich release information in build summaries

## Prerequisites

- **Toggly Account**: Sign up at [toggly.io](https://toggly.io)
- **OAuth2 Credentials**: Generate Client ID and Client Secret from your Toggly Team settings
- **Azure DevOps**: Azure DevOps organization with Build/Release pipelines

## Installation

### From Azure DevOps Marketplace

1. Visit the [Azure DevOps Marketplace](https://marketplace.visualstudio.com)
2. Search for "Toggly Feature Flags"
3. Click **Get it free**
4. Select your Azure DevOps organization
5. Click **Install**

### From VSIX Package (Development)

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Package the extension
npm run package

# This creates toggly-azure-devops-extension-1.0.0.vsix
```

Upload the VSIX file to your Azure DevOps organization:
1. Go to **Organization Settings** → **Extensions**
2. Click **Upload new extension**
3. Select the VSIX file

## Configuration

### Create Service Connection

1. Navigate to your Azure DevOps project
2. Go to **Project Settings** → **Service Connections**
3. Click **New Service Connection**
4. Select **Toggly Feature Flags**
5. Fill in the required information:
   - **Service Connection Name**: e.g., "Toggly-Production"
   - **Client ID**: Your OAuth2 Client ID from Toggly
   - **Client Secret**: Your OAuth2 Client Secret from Toggly
   - **Authority URL**: `https://auth.toggly.io` (default)
   - **API URL**: `https://app.toggly.io/api` (default)
6. Click **Verify connection** to test
7. Click **Save**

### Get OAuth2 Credentials from Toggly

1. Log in to [toggly.io](https://toggly.io)
2. Go to **Team Settings**
3. Navigate to **API Credentials**
4. Click **Create New Credential**
5. Set scope to `apiAccess`
6. Copy the generated **Client ID** and **Client Secret**

## Available Tasks

### 1. Toggly - Create Release

Creates a new Toggly release with release notes and feature changes.

**Inputs:**
- **Service Connection** (required): Select Toggly service connection
- **Application ID** (required): Your Toggly application ID
- **Release Name** (required): Name for the release (supports variables)
- **Release Notes** (optional): Markdown-formatted release notes
- **Feature Changes** (optional): JSON array of feature flag changes

**Outputs:**
- `Toggly.ReleaseId`: The created release ID
- `Toggly.ReleaseUrl`: URL to view the release

**Example:**

```yaml
- task: TogglyCreateRelease@1
  inputs:
    connectedService: 'Toggly-Production'
    applicationId: 'app-12345'
    name: 'Release $(Build.BuildNumber)'
    releaseNotes: |
      ## Release $(Build.BuildNumber)
      
      ### Features
      - New user dashboard
      - Improved performance
      
      ### Bug Fixes
      - Fixed login issue
```

### 2. Toggly - Associate Build

Associates the current Azure DevOps build with a Toggly release.

**Inputs:**
- **Service Connection** (required)
- **Project Key** (required): Application ID or project name
- **Environment** (required): Target environment
- **Mode** (required): How to find/create release
- **Release Template Key** (optional)
- **Name Pattern** (optional): Pattern for release name

**Outputs:**
- `Toggly.ReleaseId`: The associated release ID
- `Toggly.ReleaseUrl`: URL to view the release

**Example:**

```yaml
- task: TogglyAssociateBuild@1
  inputs:
    connectedService: 'Toggly-Production'
    projectKey: 'my-app'
    environment: 'Production'
    mode: 'use-latest-draft-or-create'
    namePattern: 'Release ${branch} - ${buildNumber}'
```

### 3. Toggly - Create Feature

Creates a new feature flag in Toggly.

**Inputs:**
- **Service Connection** (required)
- **Application ID** (required)
- **Feature Name** (required): Display name
- **Feature Key** (required): Unique identifier
- **Description** (optional): Markdown description
- **Category** (optional): Organization category
- **Tags** (optional): Comma-separated tags

**Outputs:**
- `Toggly.FeatureKey`: The created feature key

**Example:**

```yaml
- task: TogglyCreateFeature@1
  inputs:
    connectedService: 'Toggly-Production'
    applicationId: 'app-12345'
    featureName: 'New Dashboard'
    featureKey: 'new-dashboard'
    description: 'Redesigned user dashboard with improved UX'
    tags: 'ui, dashboard, v2'
```

### 4. Toggly - Update Feature

Updates metadata for an existing feature flag.

**Inputs:**
- **Service Connection** (required)
- **Application ID** (required)
- **Feature Key** (required): Feature to update
- **Feature Name** (optional): New display name
- **Description** (optional): New description
- **Category** (optional): New category
- **Tags** (optional): New tags

**Example:**

```yaml
- task: TogglyUpdateFeature@1
  inputs:
    connectedService: 'Toggly-Production'
    applicationId: 'app-12345'
    featureKey: 'new-dashboard'
    description: 'Updated dashboard - now with real-time updates'
```

### 5. Toggly - Update Feature Environment

Enable, disable, or configure a feature flag on a specific environment.

**Inputs:**
- **Service Connection** (required)
- **Application ID** (required)
- **Environment** (required): Target environment
- **Feature Key** (required): Feature to configure
- **Action** (required): Enable, Disable, or Custom Filters
- **Filters** (optional): JSON array of filters (for Custom action)

**Example:**

```yaml
# Enable a feature
- task: TogglyUpdateFeatureEnv@1
  inputs:
    connectedService: 'Toggly-Production'
    applicationId: 'app-12345'
    environment: 'Production'
    featureKey: 'new-dashboard'
    action: 'enable'

# Disable a feature
- task: TogglyUpdateFeatureEnv@1
  inputs:
    connectedService: 'Toggly-Production'
    applicationId: 'app-12345'
    environment: 'Staging'
    featureKey: 'experimental-feature'
    action: 'disable'

# Custom filters (gradual rollout to 20%)
- task: TogglyUpdateFeatureEnv@1
  inputs:
    connectedService: 'Toggly-Production'
    applicationId: 'app-12345'
    environment: 'Production'
    featureKey: 'new-checkout'
    action: 'custom'
    filters: |
      [{
        "name": "PercentageFilter",
        "parameters": { "Value": 20 }
      }]
```

### 6. Toggly - Activate Release

Activates a release, applying all feature flag changes. Can wait for gates to pass.

**Inputs:**
- **Service Connection** (required)
- **Release ID** (optional): Defaults to `$(Toggly.ReleaseId)`
- **Wait for Gates** (optional): Poll and wait for gates
- **Gate Timeout** (optional): Max wait time in seconds (default: 300)
- **Gate Poll Interval** (optional): Time between checks in seconds (default: 10)

**Example:**

```yaml
- task: TogglyActivateRelease@1
  inputs:
    connectedService: 'Toggly-Production'
    releaseId: '$(Toggly.ReleaseId)'
    waitForGates: true
    gateTimeout: 600
    gatePollInterval: 15
```

### 7. Toggly - Rollback Release

Rolls back a release, restoring feature flags to their previous state.

**Inputs:**
- **Service Connection** (required)
- **Release ID** (optional): Defaults to `$(Toggly.ReleaseId)`
- **Reason** (optional): Reason for rollback

**Example:**

```yaml
- task: TogglyRollbackRelease@1
  condition: failed()  # Only run on failure
  inputs:
    connectedService: 'Toggly-Production'
    releaseId: '$(Toggly.ReleaseId)'
    reason: 'Deployment failed - automatic rollback'
```

## Complete Pipeline Examples

### Example 1: Basic Release Flow

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  TogglyConnection: 'Toggly-Production'
  AppId: 'app-12345'

stages:
  - stage: Build
    jobs:
      - job: Build
        steps:
          # Create release
          - task: TogglyCreateRelease@1
            inputs:
              connectedService: '$(TogglyConnection)'
              applicationId: '$(AppId)'
              name: 'v$(Build.BuildNumber)'
              releaseNotes: 'Automated release from build $(Build.BuildNumber)'

          # Associate build
          - task: TogglyAssociateBuild@1
            inputs:
              connectedService: '$(TogglyConnection)'
              projectKey: '$(AppId)'
              environment: 'Production'

          # Build steps
          - script: npm install && npm run build

  - stage: Deploy
    dependsOn: Build
    jobs:
      - deployment: Deploy
        environment: Production
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying..."
                
                # Activate release
                - task: TogglyActivateRelease@1
                  inputs:
                    connectedService: '$(TogglyConnection)'
```

### Example 2: With Gates and Rollback

```yaml
- stage: Deploy
  jobs:
    - deployment: DeployProduction
      environment: Production
      strategy:
        runOnce:
          deploy:
            steps:
              # Deploy application
              - script: |
                  kubectl apply -f deployment.yaml
                  kubectl wait --for=condition=ready pod -l app=myapp

              # Activate with gates
              - task: TogglyActivateRelease@1
                inputs:
                  connectedService: 'Toggly-Prod'
                  waitForGates: true
                  gateTimeout: 600

          on:
            failure:
              steps:
                # Rollback on failure
                - task: TogglyRollbackRelease@1
                  inputs:
                    connectedService: 'Toggly-Prod'
                    reason: 'Deployment validation failed'
```

### Example 3: Progressive Feature Rollout

```yaml
- stage: ProgressiveRollout
  jobs:
    - job: Rollout
      steps:
        # 10% rollout
        - task: TogglyUpdateFeatureEnv@1
          inputs:
            connectedService: 'Toggly-Prod'
            applicationId: 'app-12345'
            environment: 'Production'
            featureKey: 'new-checkout'
            action: 'custom'
            filters: |
              [{"name": "PercentageFilter", "parameters": {"Value": 10}}]

        # Wait and monitor
        - script: sleep 600  # 10 minutes

        # 50% rollout
        - task: TogglyUpdateFeatureEnv@1
          inputs:
            connectedService: 'Toggly-Prod'
            applicationId: 'app-12345'
            environment: 'Production'
            featureKey: 'new-checkout'
            action: 'custom'
            filters: |
              [{"name": "PercentageFilter", "parameters": {"Value": 50}}]

        # Wait and monitor
        - script: sleep 600  # 10 minutes

        # 100% rollout
        - task: TogglyUpdateFeatureEnv@1
          inputs:
            connectedService: 'Toggly-Prod'
            applicationId: 'app-12345'
            environment: 'Production'
            featureKey: 'new-checkout'
            action: 'enable'
```

## Build Summary

The extension automatically adds release information to your Azure DevOps build summary, including:

- Release name and status
- Feature flag changes
- Gate status and evaluation results
- CI/CD build links
- Direct links to view releases in Toggly

## Pipeline Variables

The extension sets these variables for use in subsequent tasks:

| Variable | Description | Set By |
|----------|-------------|--------|
| `Toggly.ReleaseId` | Release ID | Create Release, Associate Build |
| `Toggly.ReleaseUrl` | Release URL | Create Release, Associate Build |
| `Toggly.FeatureKey` | Feature Key | Create Feature |

## Troubleshooting

### Authentication Errors

**Problem**: "Service connection not found" or "Authentication failed"

**Solution**:
1. Verify service connection exists and is named correctly
2. Check OAuth2 credentials are valid
3. Ensure the API token has `apiAccess` scope
4. Test the service connection in Azure DevOps

### API Errors

**Problem**: "Application not found" or "Feature not found"

**Solution**:
1. Verify Application ID is correct
2. Check you have access to the application/team
3. Ensure feature keys match exactly (case-sensitive)

### Gate Timeout

**Problem**: Gates timeout before passing

**Solution**:
1. Increase `gateTimeout` value
2. Check gate configurations in Toggly
3. Review gate evaluation logs in Toggly UI

## Development

### Build from Source

```bash
# Clone repository
git clone https://github.com/ops-ai/Toggly.FeatureManagement.git
cd Toggly.FeatureManagement/Toggly.AzureDevOps

# Install dependencies
npm install

# Build TypeScript
npm run build

# Create VSIX package
npm run package
```

### Testing Locally

1. Build the extension
2. Upload VSIX to your test Azure DevOps organization
3. Create a test pipeline
4. Add Toggly tasks
5. Configure service connection with test credentials
6. Run the pipeline

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - See [LICENSE](https://github.com/ops-ai/Toggly.FeatureManagement/blob/main/LICENSE)

## Support

- **Documentation**: [docs.toggly.io](https://docs.toggly.io)
- **Issues**: [GitHub Issues](https://github.com/ops-ai/Toggly.FeatureManagement/issues)
- **Email**: support@toggly.io

## Links

- [Toggly Website](https://toggly.io)
- [Documentation](https://docs.toggly.io)
- [Azure DevOps Integration Guide](https://docs.toggly.io/integrations/azure-devops)
- [GitHub Repository](https://github.com/ops-ai/Toggly.FeatureManagement)

