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

### Changes from PR #4 (Add internal server error test)

### Added
- `prices/prices.yaml` now includes a "500: Internal Server Error" message along with its schema.

### Changed
- Updated the `scripts/generate-changelog.js` to:
  - Fetch the latest file details instead of checking if the changelog file exists.
  - Use the latest SHA when updating the existing changelog PR.
  - Create a new branch when there is no existing changelog PR.

### Removed
- Removed checking if the changelog file exists from `scripts/generate-changelog.js` script. Now, it fetches the latest file details directly.
