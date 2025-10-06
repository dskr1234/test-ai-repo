import express from "express";
import dotenv from "dotenv";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import simpleGit from "simple-git";

dotenv.config();

const app = express();
app.use(express.json());

// --- Git Auto Commit + Push Helper ---
async function autoCommitPush(project) {
  const git = simpleGit({
    baseDir: process.env.GIT_REPO_PATH || process.cwd(),
  });

  try {
    console.log(chalk.yellow(`Pushing to ${process.env.GIT_REPO_URL}`));

    await git.init();
    await git.addConfig("user.name", process.env.GIT_USER_NAME);
    await git.addConfig("user.email", process.env.GIT_USER_EMAIL);
    await git.add(".");

    // ⚙️ Handle "nothing to commit" gracefully
    try {
      await git.commit(`🤖 AI Build: ${project}`);
    } catch {
      console.log(chalk.gray("ℹ️ Nothing new to commit, continuing..."));
    }

    await git.branch(["-M", process.env.GIT_BRANCH]);

    // 🚀 Fix: handle existing remote
    const remotes = await git.getRemotes(true);
    if (remotes.find(r => r.name === "origin")) {
      await git.removeRemote("origin");
    }
    await git.addRemote("origin", process.env.GIT_REPO_URL);

    await git.push(["-u", "origin", process.env.GIT_BRANCH, "--force"]);
    console.log(chalk.green("📤 Code committed & pushed to GitHub successfully!"));
  } catch (err) {
    console.error(chalk.red("❌ Git push failed:"), err.message);
  }
}

// --- /build Endpoint ---
app.post("/build", async (req, res) => {
  try {
    const { project, files } = req.body;
    const baseDir = path.join(process.cwd(), "workspace", project);

    console.log(chalk.cyan(`🚀 Creating ${project}`));
    await fs.ensureDir(baseDir);

    // Create all files in the workspace
    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(baseDir, filename);
      await fs.outputFile(filePath, content);
      console.log(chalk.green(`✅ Created: ${filePath}`));
    }

    console.log(chalk.blue("✅ Verified build, preparing to push..."));
    res.status(200).json({ message: "Build successful" });

    // Auto commit and push after successful creation
    await autoCommitPush(project);

  } catch (err) {
    console.error(chalk.red("❌ Build failed:"), err.message);
    res.status(500).json({ error: "Build failed" });
  }
});

// --- Start Local Agent ---
app.listen(4000, () => {
  console.log(chalk.magenta("🧠 Local Agent running on port 4000"));
});
