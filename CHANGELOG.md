## Changelog


### Changes from PR #1 (Add changelog generator base)

### Added
- A new GitHub workflow `generate-changelog.yaml` has been added to automatically generate a changelog entry for every pull request. This uses Node.js 18 to install dependencies and run the `generate-changelog.js` script.
- The `@octokit/rest` package has been added as a dependency in `package.json`.
- A new script, `generate-changelog.js`, has been added which uses the GitHub API to fetch pull request details and uses OpenAI API to generate a concise changelog entry. This entry is then added to an existing or new pull request titled "Changelog Update".

### Removed
- The `.github/` directory is no longer ignored in `.gitignore`. 

### Updated
- Changes in `package-lock.json` seem to reflect the removal of some unnecessary packages and additions from new dependencies.
