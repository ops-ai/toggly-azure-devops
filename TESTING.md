# Testing Guide for Toggly Azure DevOps Extension

This guide covers how to test the extension locally and in a test Azure DevOps organization.

## Prerequisites

- Azure DevOps organization (create a test org at [dev.azure.com](https://dev.azure.com))
- Toggly account with test application
- OAuth2 credentials from Toggly
- Node.js 18+ installed
- tfx-cli installed globally: `npm install -g tfx-cli`

## Building the Extension

### 1. Install Dependencies

```bash
cd Toggly.AzureDevOps
npm install
```

### 2. Build TypeScript

```bash
npm run build
```

This compiles all TypeScript files and creates the bundled task files.

### 3. Package Extension

```bash
npm run package
```

This creates a `.vsix` file in the `output/` directory.

## Local Testing

### Option 1: Upload to Test Organization

1. **Create VSIX Package**
   ```bash
   npm run package
   ```

2. **Upload to Azure DevOps**
   - Go to your Azure DevOps organization
   - Navigate to **Organization Settings** → **Extensions**
   - Click **Upload new extension**
   - Select the `.vsix` file from `output/` directory
   - Click **Upload**

3. **Install in Projects**
   - Go to **Extensions** → **Manage extensions**
   - Find "Toggly Feature Flags" in the list
   - Click **Install**
   - Select the project(s) where you want to install it

### Option 2: Share with Test Organization

```bash
# Get your publisher ID from marketplace.visualstudio.com
tfx extension share \
  --manifest-globs extension/vss-extension.json \
  --share-with your-test-org \
  --token YOUR_PAT
```

## Creating Test Pipelines

### Test Pipeline 1: Basic Release Creation

Create a test pipeline in Azure DevOps:

```yaml
# test-create-release.yml
trigger: none

pool:
  vmImage: 'ubuntu-latest'

variables:
  TogglyConnection: 'Toggly-Test'  # Your test service connection
  TestAppId: 'your-test-app-id'

steps:
  - task: TogglyCreateRelease@1
    inputs:
      connectedService: '$(TogglyConnection)'
      applicationId: '$(TestAppId)'
      name: 'Test Release $(Build.BuildNumber)'
      releaseNotes: 'This is a test release'

  - script: |
      echo "Release ID: $(Toggly.ReleaseId)"
      echo "Release URL: $(Toggly.ReleaseUrl)"
    displayName: 'Display Variables'
```

### Test Pipeline 2: Complete Flow with Rollback

```yaml
# test-complete-flow.yml
trigger: none

pool:
  vmImage: 'ubuntu-latest'

variables:
  TogglyConnection: 'Toggly-Test'
  TestAppId: 'your-test-app-id'

stages:
  - stage: Build
    jobs:
      - job: BuildAndRelease
        steps:
          - task: TogglyCreateRelease@1
            inputs:
              connectedService: '$(TogglyConnection)'
              applicationId: '$(TestAppId)'
              name: 'Test $(Build.BuildNumber)'
              releaseNotes: 'Test release with full flow'

          - task: TogglyAssociateBuild@1
            inputs:
              connectedService: '$(TogglyConnection)'
              projectKey: '$(TestAppId)'
              environment: 'Test'

          - script: echo "Build completed"

  - stage: Deploy
    dependsOn: Build
    jobs:
      - deployment: Deploy
        environment: Test
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying..."

                - task: TogglyActivateRelease@1
                  inputs:
                    connectedService: '$(TogglyConnection)'

                # Simulate failure for rollback test
                - script: exit 1
                  displayName: 'Simulate Failure'
                  continueOnError: true

            on:
              failure:
                steps:
                  - task: TogglyRollbackRelease@1
                    inputs:
                      connectedService: '$(TogglyConnection)'
                      reason: 'Test rollback'
```

### Test Pipeline 3: Feature Management

```yaml
# test-feature-management.yml
trigger: none

pool:
  vmImage: 'ubuntu-latest'

variables:
  TogglyConnection: 'Toggly-Test'
  TestAppId: 'your-test-app-id'
  TestFeatureKey: 'test-feature-$(Build.BuildId)'

steps:
  # Create feature
  - task: TogglyCreateFeature@1
    inputs:
      connectedService: '$(TogglyConnection)'
      applicationId: '$(TestAppId)'
      featureName: 'Test Feature $(Build.BuildId)'
      featureKey: '$(TestFeatureKey)'
      description: 'This is a test feature'
      tags: 'test, automated'

  # Enable on Test environment
  - task: TogglyUpdateFeatureEnv@1
    inputs:
      connectedService: '$(TogglyConnection)'
      applicationId: '$(TestAppId)'
      environment: 'Test'
      featureKey: '$(TestFeatureKey)'
      action: 'enable'

  # Update feature metadata
  - task: TogglyUpdateFeature@1
    inputs:
      connectedService: '$(TogglyConnection)'
      applicationId: '$(TestAppId)'
      featureKey: '$(TestFeatureKey)'
      description: 'Updated test feature description'

  # Disable feature
  - task: TogglyUpdateFeatureEnv@1
    inputs:
      connectedService: '$(TogglyConnection)'
      applicationId: '$(TestAppId)'
      environment: 'Test'
      featureKey: '$(TestFeatureKey)'
      action: 'disable'
```

## Test Checklist

### Service Connection Tests

- [ ] Create service connection with valid credentials
- [ ] Verify connection successfully
- [ ] Test with invalid credentials (should fail gracefully)
- [ ] Test with missing credentials (should show clear error)

### Task Tests

#### Create Release Task
- [ ] Create release with minimal inputs
- [ ] Create release with release notes
- [ ] Create release with feature changes
- [ ] Verify `Toggly.ReleaseId` variable is set
- [ ] Verify `Toggly.ReleaseUrl` variable is set
- [ ] Check build summary displays correctly

#### Associate Build Task
- [ ] Associate with existing draft release
- [ ] Create new release when none exists
- [ ] Verify Azure DevOps build info is captured (branch, commit, etc.)
- [ ] Test different mode options
- [ ] Verify name pattern substitution works

#### Create Feature Task
- [ ] Create feature with minimal inputs
- [ ] Create feature with all optional fields
- [ ] Create feature with tags
- [ ] Verify `Toggly.FeatureKey` variable is set
- [ ] Test with duplicate feature key (should fail)

#### Update Feature Task
- [ ] Update feature name
- [ ] Update feature description
- [ ] Update feature tags
- [ ] Update multiple fields at once
- [ ] Test with non-existent feature (should fail)

#### Update Feature Environment Task
- [ ] Enable feature (AlwaysOn)
- [ ] Disable feature
- [ ] Set custom filters (percentage, targeting, etc.)
- [ ] Test with invalid JSON filters (should fail gracefully)
- [ ] Test with non-existent feature (should fail)

#### Activate Release Task
- [ ] Activate release without gates
- [ ] Activate release with gates (wait for pass)
- [ ] Test gate timeout
- [ ] Test with failed gates
- [ ] Verify build summary is added

#### Rollback Release Task
- [ ] Rollback activated release
- [ ] Test rollback in failure handler
- [ ] Verify warning message displayed
- [ ] Test with non-Live release (should warn)

### Integration Tests

- [ ] Run complete pipeline with all tasks
- [ ] Test multi-stage pipeline
- [ ] Test deployment with rollback on failure
- [ ] Test progressive rollout scenario
- [ ] Test multi-environment deployment

### Error Handling Tests

- [ ] Invalid Application ID
- [ ] Invalid Feature Key
- [ ] Network errors (disconnect during task)
- [ ] API rate limiting
- [ ] Expired OAuth tokens
- [ ] Missing permissions

### UI/UX Tests

- [ ] Task descriptions are clear
- [ ] Input field help text is helpful
- [ ] Error messages are actionable
- [ ] Build summary is readable
- [ ] Variables are accessible in subsequent tasks

## Debugging

### Enable Verbose Logging

Add to your pipeline:

```yaml
variables:
  system.debug: true
```

### Check Task Logs

1. Go to pipeline run
2. Click on the failed task
3. Review the detailed logs
4. Look for error messages and stack traces

### Common Issues

#### "Service connection not found"
- Verify service connection name is correct
- Check service connection exists in project settings
- Ensure it's not a typo (case-sensitive)

#### "Authentication failed"
- Verify OAuth2 credentials are valid
- Check token hasn't expired
- Ensure API token has `apiAccess` scope

#### "Task not found"
- Extension may not be installed in the project
- Try reinstalling the extension
- Check extension is enabled for the project

#### Variables not set
- Ensure previous task completed successfully
- Check tasks are in same job (variables don't persist across jobs)
- Verify task output shows variable was set

## Performance Testing

### Test with Large Payloads

```yaml
- task: TogglyCreateRelease@1
  inputs:
    connectedService: '$(TogglyConnection)'
    applicationId: '$(TestAppId)'
    name: 'Large Release $(Build.BuildNumber)'
    releaseNotes: |
      $(cat large-release-notes.md)  # Large markdown file
    featureChanges: |
      $(cat many-feature-changes.json)  # Many feature changes
```

### Test Concurrent Pipelines

Run multiple pipelines simultaneously to test:
- Rate limiting handling
- Connection pool management
- Token refresh logic

## Cleanup After Testing

### Remove Test Releases

Use Toggly UI to delete test releases.

### Remove Test Features

```yaml
# Note: Deletion task not implemented - use Toggly UI
```

### Uninstall Extension

1. Go to **Organization Settings** → **Extensions**
2. Find "Toggly Feature Flags"
3. Click **...** → **Uninstall**

## Reporting Issues

If you find bugs during testing:

1. Check existing issues: https://github.com/ops-ai/Toggly.FeatureManagement/issues
2. Create new issue with:
   - Extension version
   - Task name and version
   - Pipeline YAML (sanitized)
   - Error messages
   - Steps to reproduce
   - Expected vs actual behavior

## Next Steps

After successful testing:

1. Document any issues found
2. Fix critical bugs
3. Update version number
4. Prepare for marketplace publication
5. Create release notes

