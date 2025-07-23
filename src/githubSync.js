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

    // Ensure the local file exists before trying to read it
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]', 'utf8');
    }

    const localEvents = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const remoteFile = await getGitHubFile(octokit, owner, repo, path);

    if (remoteFile) {
        const remoteContent = Buffer.from(remoteFile.content, 'base64').toString('utf8');
        const remoteEvents = JSON.parse(remoteContent);
        
        const mergedEvents = [...localEvents];
        const localEventStrs = new Set(localEvents.map(e => JSON.stringify(e)));

        remoteEvents.forEach(remoteEvent => {
            if (!localEventStrs.has(JSON.stringify(remoteEvent))) {
                mergedEvents.push(remoteEvent);
            }
        });

        // Only update if there are changes
        if (JSON.stringify(mergedEvents) !== remoteContent) {
            await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path,
                message: 'Sync calendar data',
                content: Buffer.from(JSON.stringify(mergedEvents, null, 2)).toString('base64'),
                sha: remoteFile.sha,
            });
        }
        fs.writeFileSync(filePath, JSON.stringify(mergedEvents, null, 2), 'utf8');
    } else {
        // File doesn't exist on GitHub, so create it
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message: 'Initial calendar data',
            content: Buffer.from(JSON.stringify(localEvents, null, 2)).toString('base64'),
        });
    }
}

export { syncWithGitHub };