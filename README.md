# PR Auto-Merge App

### GitHub App to automatically merge pull requests when they are ready.

### Pull Request Validation
A pull request is considered ready when:
1. All build validations pass
2. All repository-wide merge requirements have been accepted
3. No code reviewers have "requested changes" 

### Configuration

The following options are supported:
- `auto_merge`
- `auto_squash`
- `auto_rebase`
