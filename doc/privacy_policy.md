# Privacy Policy

## What we store

This GitHub app does NOT retrieve or store:

* Your user accounts
* Your source code

What we *do* store:

* Logs for incoming GitHub hooks are temporarily persisted in our Azure Storage account.
  These logs may include your repo URL, account names, metadata about your PR status, etc.
  The logs are only used for failure analysis and are periodically purged.

To provide better auto-completion of pull requests, we may store in the future:

* State regarding active pull requests
* Relevant repo metadata including whether your repo tends to add build validation to each PR.
  This is expected to help resolve #27 due to a limitation in the GitHub API.

## What we may access

In response to events from your repo's pull requests, we use GitHub APIs to read pull request metadata including but not limited to:

* Checks status
* Labels
* Mergeability
* Reviewer status

We may also read/post PR comments in the future in order to improve interactions with repo contributors
and provide status as to when/whether the PR will be auto-completed.
