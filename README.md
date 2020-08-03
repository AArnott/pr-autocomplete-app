# Add auto-complete functionality to your GitHub pull requests

## Installation

This auto-complete functionality can be installed to your entire GitHub account, a GitHub org, or a subset of repositories that you have push permission to.

**[Install the Github App](https://github.com/apps/pr-autocomplete)** and designate which account(s) and/or repo(s) should get the functionality.

At installation, a few labels will be created in each repository so you can conveniently add them to your pull requests. These labels are described below. You may delete (and even later recreate) these labels as desired to suit the policies you follow regarding the completion of pull requests.

## Usage

Pull requests may be auto-completed with a few merge methods. Each method has an associated label that you can use to schedule auto-completion with that method.

Label | Pull request completion method
--|--
`auto-merge` | merge
`auto-squash` | squash
`auto-rebase` | rebase

A pull request will be automatically completed when *all* these conditions are met:

1. Exactly *one* of these labels is applied to a pull request.
1. No merge conflicts exist.
1. All PR checks have passed.
1. No code reviews that have requested changes remain.
1. All branch protection policies (if any) are satisfied.

### Head branch deletion

This GitHub app does *not* explicitly delete the source branch of the pull request after completing it.
If deleting the source branch after pull request completion is something you want, you can configure GitHub to do this for *all* pull requests (regardless of whether they were auto-completed) in the repository Settings page.

## Security considerations

After applying one of the auto-complete labels, if the pull request's source branch is updated by someone who lacks write permissions to the repo (e.g. a 3rd party sent the PR from a fork of your repo) the auto-complete label will be *automatically removed*. This protects your repo against unreviewed changes being merged into the repo between completion of a review and completion of the pull request.
After the untrusted update and the label's removal, simply review the latest version of the PR and (if desired) reapply the auto-completion label.
