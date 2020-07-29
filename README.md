# PR Auto-Merge App

### GitHub App to automatically merge pull requests when they are ready

### Set-up and usage
1. Install the [Github App](https://github.com/apps/pr-autocomplete) into your repository
2. Add autocomplete label to any PR that should be autocompleted (`auto_merge` `auto_squash` `auto_rebase`)
3. PR will be automatically merged once all conditions are met and merging is safe to do

### Overview: Pull Request Validation
A pull request is considered ready when:
1. All build validations pass
2. All repository-wide merge requirements have been accepted
3. No code reviewers have "requested changes"
4. The most recent change was executed by a contributor with ADMIN or WRITE (Collaborator) permissions

**Additional details & Security**
- PR Auto-merge will follow repository-wide merge and build requirements (including required reviewers and failed tests)
- Any requested/suggested changes from code reviewers will block automerge/autosquash, regardless of permissions
- All autocomplete labels will be removed when any contributor without WRITE permissions performs any actions (including pushing changes to a repository)
- If multiple autocomplete labels are included at once, no autocomplete will not be performed

### Configuration

The following **autocomplete** options are supported:
- `auto_merge`
- `auto_squash`
- `auto_rebase`

PR will be merged, squashed or rebased according to repository-wide settings
- Branches will be automatically deleted only if setting is activated

