# Publishing Guide for Toggly Azure DevOps Extension

This guide covers how to publish the extension to the Azure DevOps Marketplace.

## Prerequisites

- **Visual Studio Marketplace Account**: Sign up at [marketplace.visualstudio.com](https://marketplace.visualstudio.com/manage)
- **Publisher**: Create a publisher in the marketplace
- **Personal Access Token (PAT)**: Generate a PAT with **Marketplace (Manage)** permission
- **Extension Built**: Run `npm run package` to create VSIX
- **Testing Complete**: Ensure all tests pass
- **Documentation Ready**: README, screenshots, icons prepared

## Setup Publisher

### 1. Create Publisher Account

1. Go to [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)
2. Click **Create publisher**
3. Fill in publisher details:
   - **Publisher ID**: `toggly` (must be unique, lowercase, no spaces)
   - **Display Name**: `Toggly`
   - **Description**: Feature flag management for Azure DevOps
   - **Website**: `https://toggly.io`
   - **Contact Email**: `support@toggly.io`
4. Upload publisher logo (at least 128x128)
5. Click **Create**

### 2. Generate Personal Access Token

1. Go to [dev.azure.com](https://dev.azure.com)
2. Click on your profile → **Security**
3. Click **+ New Token**
4. Configure token:
   - **Name**: "Marketplace Publishing"
   - **Organization**: Select your organization
   - **Scopes**: Select **Custom defined**
   - Check **Marketplace (Manage)**
5. Click **Create**
6. **Copy the token immediately** (you won't see it again!)
7. Store securely (e.g., in password manager or Azure Key Vault)

## Prepare Extension for Publishing

### 1. Update Extension Manifest

Edit `extension/vss-extension.json`:

```json
{
  "manifestVersion": 1,
  "id": "toggly-feature-flags",
  "name": "Toggly Feature Flags",
  "version": "1.0.0",  // Update version
  "publisher": "toggly",  // Your publisher ID
  "description": "Manage Toggly feature flags in Azure DevOps Build and Release pipelines",
  // ... rest of manifest
}
```

### 2. Create Extension Icon

Create a 128x128 PNG icon at `extension/images/extension-icon.png`:

- Use Toggly logo
- Ensure it looks good on both light and dark backgrounds
- No transparency issues
- High quality, not pixelated

### 3. Take Screenshots

Create screenshots in `extension/images/screenshots/`:

- **create-release-task.png**: Task in pipeline designer
- **service-connection.png**: Service connection configuration
- **build-summary.png**: Build summary with release info
- **pipeline-yaml.png**: Example YAML configuration

Best practices:
- Use 1280x720 or higher resolution
- Show the extension in action
- Highlight key features
- Use realistic data (blur sensitive info)

### 4. Update README/Overview

Ensure `extension/overview.md` includes:

- Clear description of what the extension does
- Installation instructions
- Configuration steps
- Example pipelines
- Screenshots and animated GIFs
- Links to documentation
- Support information

### 5. Version Control

Follow semantic versioning:

- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backward compatible
- **Patch** (0.0.1): Bug fixes

Update version in:
- `extension/vss-extension.json`
- `package.json`
- All task `task.json` files

## Publishing Process

### Initial Publication (Private)

Publish privately first to test in your organization:

```bash
# Package extension
npm run package

# Publish as private (shared with your organization)
tfx extension publish \
  --manifest-globs extension/vss-extension.json \
  --share-with your-organization-name \
  --token YOUR_PAT

# Or use npm script (configure first)
npm run publish
```

### Test Private Extension

1. Go to your Azure DevOps organization
2. Navigate to **Organization Settings** → **Extensions** → **Shared**
3. Find "Toggly Feature Flags"
4. Click **Install**
5. Test thoroughly in a real project
6. Fix any issues found
7. Update version and republish

### Public Publication

Once testing is complete, make it public:

```bash
# Publish publicly
tfx extension publish \
  --manifest-globs extension/vss-extension.json \
  --token YOUR_PAT

# This makes it available to all Azure DevOps users
```

Or update visibility in marketplace:

1. Go to [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)
2. Find your extension
3. Click **...** → **Make Public**
4. Confirm

## After Publishing

### 1. Verify Marketplace Listing

Check your extension at:
```
https://marketplace.visualstudio.com/items?itemName=toggly.toggly-feature-flags
```

Verify:
- Description renders correctly
- Screenshots display properly
- Links work
- Version is correct
- Pricing is correct (Free)

### 2. Update Documentation

Add marketplace link to:
- Main README
- Toggly documentation site
- GitHub repository
- Blog posts/announcements

### 3. Announce Release

- Tweet announcement
- Blog post
- Email to users
- Update Toggly dashboard
- Add to integrations page

### 4. Monitor Adoption

Track metrics:
- Install count
- Active users
- Ratings and reviews
- Q&A questions
- GitHub issues

## Updating the Extension

### For Bug Fixes (Patch)

1. Fix the bug
2. Update patch version (1.0.0 → 1.0.1)
3. Update all task versions
4. Test thoroughly
5. Build and package
6. Publish update

```bash
# Update version
npm version patch

# Build and publish
npm run build
npm run package
tfx extension publish --manifest-globs extension/vss-extension.json --token YOUR_PAT
```

### For New Features (Minor)

1. Implement feature
2. Update documentation
3. Add tests
4. Update minor version (1.0.0 → 1.1.0)
5. Update changelog
6. Build, package, and publish

### For Breaking Changes (Major)

1. Plan migration path for users
2. Update documentation with migration guide
3. Announce breaking changes in advance
4. Update major version (1.0.0 → 2.0.0)
5. Consider supporting old version temporarily
6. Build, package, and publish

## Marketplace Best Practices

### Description

- Clear, concise value proposition
- List key features prominently
- Include use cases and scenarios
- Add comparison with alternatives
- Mention enterprise support

### Screenshots

- First screenshot is most important
- Show the extension solving a real problem
- Use captions to explain each screenshot
- Include animated GIFs for complex flows
- Update screenshots with each major version

### Tags

Use relevant tags:
- `feature-flags`
- `feature-toggles`
- `deployment`
- `release-management`
- `ci-cd`
- `devops`

### Categories

Select appropriate categories:
- Azure Pipelines
- Azure Boards (if applicable)

### Q&A

- Monitor questions regularly
- Respond promptly (within 24 hours)
- Be helpful and professional
- Link to documentation
- Consider adding FAQ to README

### Reviews

- Respond to all reviews
- Thank users for positive feedback
- Address concerns in negative reviews
- Fix issues mentioned in reviews
- Ask satisfied users to leave reviews

## Troubleshooting Publication

### Error: "Publisher not found"

- Verify publisher ID in manifest matches marketplace
- Check spelling and case
- Ensure publisher is created in marketplace

### Error: "Extension with this ID already exists"

- Extension ID must be unique across marketplace
- Check if someone else published it
- Change extension ID if needed

### Error: "Invalid manifest"

- Validate JSON syntax
- Check all required fields
- Ensure task IDs are valid GUIDs
- Verify version format (X.Y.Z)

### Error: "Token expired"

- Generate new PAT
- Ensure token has Marketplace (Manage) scope
- Check token hasn't been revoked

### Warning: "Some images not found"

- Verify all referenced images exist
- Check file paths in manifest
- Ensure images meet size requirements

## Support and Maintenance

### Responding to Issues

1. Monitor GitHub issues
2. Triage and prioritize
3. Respond within 48 hours
4. Fix critical bugs immediately
5. Plan features for next release

### Security Updates

If a security vulnerability is found:

1. Fix immediately
2. Publish patch update
3. Notify users
4. Document in security advisory
5. Credit reporter (if appropriate)

### Deprecation

If deprecating extension or features:

1. Announce 6+ months in advance
2. Provide migration path
3. Update documentation
4. Show warnings in extension
5. Eventually unlist from marketplace

## Metrics and Analytics

Track extension success:

- **Installs**: Total installations
- **Uninstalls**: Track uninstall rate
- **Active Users**: Daily/weekly/monthly
- **Ratings**: Average rating score
- **Reviews**: Read and categorize
- **Q&A**: Questions asked
- **Downloads**: VSIX downloads

Use data to:
- Prioritize features
- Fix common issues
- Improve documentation
- Plan roadmap

## Compliance

Ensure extension complies with:

- [Azure DevOps Extension Policies](https://learn.microsoft.com/azure/devops/extend/develop/manifest)
- Privacy regulations (GDPR, CCPA)
- Security best practices
- Microsoft's Terms of Service
- Open source licenses (if applicable)

## Resources

- [Azure DevOps Extension Documentation](https://learn.microsoft.com/azure/devops/extend)
- [Marketplace Publisher Portal](https://marketplace.visualstudio.com/manage)
- [tfx-cli Documentation](https://github.com/Microsoft/tfs-cli)
- [Packaging Extensions](https://learn.microsoft.com/azure/devops/extend/develop/add-build-task)
- [Publishing Extensions](https://learn.microsoft.com/azure/devops/extend/publish/overview)

## Checklist

Before publishing to production:

- [ ] Extension manifest is complete and correct
- [ ] All tasks have unique GUIDs
- [ ] Version numbers are updated
- [ ] Extension icon exists and looks good
- [ ] Screenshots are high quality and relevant
- [ ] README/Overview is comprehensive
- [ ] All links work
- [ ] Extension tested in real Azure DevOps org
- [ ] All tasks tested successfully
- [ ] Service connection works
- [ ] Build summary displays correctly
- [ ] Error handling is robust
- [ ] Documentation is up to date
- [ ] GitHub repository is public
- [ ] License file exists
- [ ] Publisher account is set up
- [ ] PAT is generated and stored securely
- [ ] Changelog is updated
- [ ] Marketing materials prepared

## Contact

For help with publishing:

- **Documentation**: [docs.toggly.io](https://docs.toggly.io)
- **Issues**: [GitHub Issues](https://github.com/ops-ai/Toggly.FeatureManagement/issues)
- **Email**: support@toggly.io

