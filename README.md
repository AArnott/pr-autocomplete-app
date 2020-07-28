# PR Auto-Merge App
<p align="center">
  <a href="https://github.com/actions/typescript-action/actions"><img alt="typescript-action status" src="https://github.com/actions/typescript-action/workflows/build-test/badge.svg"></a>
</p>

### GitHub App to automatically merge pull requests when they are ready.

### Pull Request Validation
A pull request is considered ready when
1. All build validations pass
2. No code reviewers have "requested changes" 

### Configuration

The following options are supported:
- `auto_merge`
- `auto_squash`
- `auto_rebase`
