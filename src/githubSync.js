import { Octokit } from '@octokit/rest';
import fs from 'fs';
import yaml from 'js-yaml';
import os from 'os';
import path from 'path';

const SAVE_DIR = path.join(os.homedir(), '.config', 'geekcalendar');

function getConfig() {
    const configPath = path.join(SAVE_DIR, 'config.yml');
    if (!fs.existsSync(configPath)) {
        throw new Error('config.yml not found in ~/.config/geekcalendar/. Please create it with your GitHub repository details.');
    }
    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    return config.github;
}

async function getGitHubFile(octokit, owner, repo, path) {
    try {
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path,
        });
        return data;
    } catch (error) {
        if (error.status === 404) {
            return null; // File doesn't exist
        }
        throw error;
    }
}

async function syncWithGitHub(filePath) {
    const { owner, repo, path, token } = getConfig();
    const octokit = new Octokit({ auth: token });

    // Ensure the local file exists and get its mtime
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]', 'utf8');
    }
    const localEvents = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const localStats = fs.statSync(filePath);
    const localMtimeMs = localStats.mtimeMs; // Modification time in milliseconds

    // Get remote file content and its last commit date
    let remoteFile = null;
    let remoteCommitDateMs = 0; // Initialize to 0 for non-existent or old files

    try {
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path,
        });
        remoteFile = data;

        // Fetch commit details for the specific file's path to get its last modified date
        const { data: commits } = await octokit.repos.listCommits({
            owner,
            repo,
            path,
            per_page: 1, // Only need the latest
        });
        if (commits && commits.length > 0) {
            remoteCommitDateMs = new Date(commits[0].commit.committer.date).getTime();
        }
    } catch (error) {
        if (error.status === 404) {
            remoteFile = null; // File doesn't exist on GitHub
        } else {
            throw error;
        }
    }

    // Decide sync direction based on timestamps
    let finalEvents = [];
    if (!remoteFile) {
        // Remote file doesn't exist, create it from local
        finalEvents = localEvents;
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message: 'Initial calendar data',
            content: Buffer.from(JSON.stringify(finalEvents, null, 2)).toString('base64'),
        });
        fs.writeFileSync(filePath, JSON.stringify(finalEvents, null, 2), 'utf8'); // Ensure local is formatted
    } else {
        const remoteContent = Buffer.from(remoteFile.content, 'base64').toString('utf8');
        const remoteEvents = JSON.parse(remoteContent);

        // Compare timestamps
        if (localMtimeMs > remoteCommitDateMs) {
            // Local is newer, push local to GitHub
            finalEvents = localEvents;
            if (JSON.stringify(finalEvents) !== remoteContent) { // Only push if content actually changed
                await octokit.repos.createOrUpdateFileContents({
                    owner,
                    repo,
                    path,
                    message: 'Sync calendar data: Local is newer',
                    content: Buffer.from(JSON.stringify(finalEvents, null, 2)).toString('base64'),
                    sha: remoteFile.sha,
                });
            }
            fs.writeFileSync(filePath, JSON.stringify(finalEvents, null, 2), 'utf8'); // Ensure local is formatted
        } else if (remoteCommitDateMs > localMtimeMs) {
            // Remote is newer, pull from GitHub to local
            finalEvents = remoteEvents;
            fs.writeFileSync(filePath, JSON.stringify(finalEvents, null, 2), 'utf8');
        } else {
            // Timestamps are equal or no meaningful difference, check content for potential manual changes or re-formatting
            if (JSON.stringify(localEvents) !== remoteContent) {
                // Contents are different but timestamps are same (e.g., re-formatted locally or remotely)
                // Prioritize local in this ambiguous case
                finalEvents = localEvents;
                await octokit.repos.createOrUpdateFileContents({
                    owner,
                    repo,
                    path,
                    message: 'Sync calendar data: Content differs, local prioritized',
                    content: Buffer.from(JSON.stringify(finalEvents, null, 2)).toString('base64'),
                    sha: remoteFile.sha,
                });
                fs.writeFileSync(filePath, JSON.stringify(finalEvents, null, 2), 'utf8');
            } else {
                // Local and remote are in sync. No action needed.
                finalEvents = localEvents;
            }
        }
    }
}

export { syncWithGitHub };