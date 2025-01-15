const axios = require("axios");
const fs = require("fs");

const githubToken = process.env.GH_ACCESS_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const prNumber = process.env.GITHUB_REF_NAME.split("/")[2];
const owner = "thebrianchen";
const repo = "docs-openapi-spec";

(async () => {
  const { Octokit } = await import("@octokit/rest");
  const octokit = new Octokit({ auth: githubToken });

  async function fetchPRDetails() {
    console.log("STARTING FETCH")
    console.log("pr number", prNumber)
    // Fetch PR files
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    // Summarize changes
    return files.map((file) => ({
      filename: file.filename,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch,
    }));
  }

  async function generateChangelog(prDetails) {
    const prompt = `Generate a concise changelog entry based on these PR changes:\n\n${JSON.stringify(
      prDetails
    )}`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: { Authorization: `Bearer ${openaiApiKey}` },
      }
    );

    return response.data.choices[0].message.content.trim();
  }

  async function main() {
    const prDetails = await fetchPRDetails();
    const changelogEntry = await generateChangelog(prDetails);

    console.log("Generated Changelog:\n", changelogEntry);

    // Append to CHANGELOG.md
    fs.appendFileSync("CHANGELOG.md", `\n${changelogEntry}\n`);

    // Commit the updated changelog
    require("child_process").execSync(`
      git config user.name "github-actions[bot]"
      git config user.email "github-actions[bot]@users.noreply.github.com"
      git add CHANGELOG.md
      git commit -m "Update CHANGELOG.md for PR #${prNumber}"
      git push
    `);
  }

  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
})();