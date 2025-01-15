const axios = require("axios");
const fs = require("fs");

const githubToken = process.env.GH_ACCESS_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const prNumber = process.env.PR_NUMBER;
const prTitle = process.env.PR_TITLE;
const owner = "thebrianchen";
const repo = "docs-openapi-specs";

(async () => {
  const { Octokit } = await import("@octokit/rest");
  const octokit = new Octokit({ auth: githubToken });

  // Safeguard to prevent infinite recursion
  if (prTitle && prTitle.startsWith("Changelog Update")) {
    console.log("This is a Changelog Update PR. Exiting to avoid recursion.");
    process.exit(0);
  }

  async function fetchPRDetails() {
    console.log("STARTING FETCH");
    console.log("pr number", prNumber);
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

  async function findOrCreateChangelogPR(changelogEntry) {
    const formattedEntry = `### Changes from PR #${prNumber} (${prTitle})\n\n${changelogEntry}\n`;
    const changelogPath = "CHANGELOG.md";
    let changelogContent = "";
    let latestSha = null;
  
    try {
      const { data: fileData } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: changelogPath,
      });
  
      changelogContent = Buffer.from(fileData.content, "base64").toString("utf-8");
      latestSha = fileData.sha;
    } catch (error) {
      if (error.status === 404) {
        console.log("CHANGELOG.md does not exist. Creating a new file.");
        changelogContent = "## Changelog\n\n";
      } else {
        throw error;
      }
    }
  
    if (!changelogContent.includes(formattedEntry)) {
      changelogContent += `\n${formattedEntry}`;
    }
  
    // Create or update the changelog branch
    const branchName = `changelog/update-${Date.now()}`;
    const baseBranch = (await octokit.rest.repos.get({ owner, repo })).data.default_branch;
  
    try {
      // Check if branch already exists
      await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
      });
  
      console.log(`Branch ${branchName} already exists. Force-pushing changes...`);
    } catch (error) {
      if (error.status === 404) {
        console.log("Branch does not exist. Creating a new branch...");
        await octokit.rest.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${branchName}`,
          sha: (
            await octokit.rest.git.getRef({
              owner,
              repo,
              ref: `heads/${baseBranch}`,
            })
          ).data.object.sha,
        });
      } else {
        throw error;
      }
    }
  
    // Force push the updated changelog content
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: changelogPath,
      message: "Update changelog",
      content: Buffer.from(changelogContent).toString("base64"),
      branch: branchName,
      sha: latestSha, // Use the latest SHA or null for new files
    });
  
    // Check for an existing pull request
    const { data: pullRequests } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
    });
  
    const changelogPR = pullRequests.find((pr) =>
      pr.title.startsWith("Changelog Update") ||
      pr.labels.some((label) => label.name === "changelog-update")
    );
  
    if (!changelogPR) {
      // Create a pull request
      console.log("No existing changelog PR found. Creating a new one...");
      await octokit.rest.pulls.create({
        owner,
        repo,
        title: "Changelog Update",
        head: branchName,
        base: baseBranch,
        body: "Automated changelog update.",
        labels: ["changelog-update"],
      });
    } else {
      console.log(`Changelog PR already exists: #${changelogPR.number}.`);
    }
  }

  async function main() {
    const prDetails = await fetchPRDetails();
    const changelogEntry = await generateChangelog(prDetails);

    console.log("Generated Changelog:\n", changelogEntry);

    await findOrCreateChangelogPR(changelogEntry);
  }

  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
})();
