import { Octokit } from '@octokit/rest';
import fs from 'fs';
import yaml from 'js-yaml';
import os from 'os';
import path from 'path';

const SAVE_DIR = path.join(os.homedir(), '.config', 'geekcalendar');
const BACKUP_DIR = path.join(SAVE_DIR, 'backups');

function ensureDirExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function getConfig() {
    const configPath = path.join(SAVE_DIR, 'config.yml');
    if (!fs.existsSync(configPath)) {
        throw new Error('config.yml not found in ~/.config/geekcalendar/. Please create it with your GitHub repository details.');
    }
    let loaded;
    try {
        loaded = yaml.load(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        throw new Error(`Failed to parse config.yml: ${error.message}`);
    }
    const cfg = loaded && loaded.github ? loaded.github : {};
    // Allow token override via environment variable for security
    const tokenFromEnv = process.env.GEEKCAL_GITHUB_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const finalConfig = {
        owner: cfg.owner,
        repo: cfg.repo,
        path: cfg.path,
        token: tokenFromEnv || cfg.token
    };
    const missing = Object.entries(finalConfig)
        .filter(([key, value]) => !value)
        .map(([key]) => key);
    if (missing.length > 0) {
        throw new Error(`Missing GitHub config values: ${missing.join(', ')}. Check ~/.config/geekcalendar/config.yml or environment variables.`);
    }
    return finalConfig;
}

function ensureBackupDir() {
    ensureDirExists(BACKUP_DIR);
}

function normalizeEvents(events) {
    if (!Array.isArray(events)) return [];
    // Sort for stable comparison and writing
    return [...events].sort((a, b) => {
        const ya = Number(a.year) || 0;
        const yb = Number(b.year) || 0;
        if (ya !== yb) return ya - yb;
        const ma = Number(a.month) || 0;
        const mb = Number(b.month) || 0;
        if (ma !== mb) return ma - mb;
        const da = Number(a.day) || 0;
        const db = Number(b.day) || 0;
        if (da !== db) return da - db;
        const ta = (a.text || '').toString();
        const tb = (b.text || '').toString();
        return ta.localeCompare(tb);
    });
}

function eventsEqual(a, b) {
    const na = normalizeEvents(a);
    const nb = normalizeEvents(b);
    return JSON.stringify(na) === JSON.stringify(nb);
}

async function fetchRemoteFileAndCommit(octokit, owner, repo, filePathInRepo) {
    let remoteFile = null;
    let remoteEvents = [];
    let remoteSha = null;
    let remoteCommitDateMs = 0;
    let remoteLatestCommitSha = null;
    try {
        const { data } = await octokit.repos.getContent({ owner, repo, path: filePathInRepo });
        if (data && data.type === 'file') {
            remoteFile = data;
            remoteSha = data.sha;
            let remoteContent = '';
            try {
                remoteContent = Buffer.from(data.content, 'base64').toString('utf8');
                const parsed = JSON.parse(remoteContent);
                remoteEvents = Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                throw new Error('Remote calendar file is not valid JSON. Please fix the file in the repository or remove it.');
            }
        } else if (data) {
            throw new Error('Remote path exists but is not a file. Please point to a JSON file in config.');
        }
        try {
            const { data: commits } = await octokit.repos.listCommits({ owner, repo, path: filePathInRepo, per_page: 1 });
            if (commits && commits.length > 0) {
                remoteCommitDateMs = new Date(commits[0].commit.committer.date).getTime();
                remoteLatestCommitSha = commits[0].sha;
            }
        } catch {
            // ignore commit lookup failures; keep timestamp 0
        }
    } catch (error) {
        if (error.status === 404) {
            remoteFile = null;
            remoteEvents = [];
            remoteSha = null;
            remoteCommitDateMs = 0;
            remoteLatestCommitSha = null;
        } else {
            throw error;
        }
    }
    return { remoteFile, remoteEvents, remoteSha, remoteCommitDateMs, remoteLatestCommitSha };
}

async function syncWithGitHub(filePath) {
    // Ensure directories exist before any file IO
    ensureDirExists(SAVE_DIR);
    ensureBackupDir();

    // Ensure local file exists; create if missing
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]', 'utf8');
    }

    // Backup only after confirming the source exists
    try {
        const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
        const backupFilePath = path.join(BACKUP_DIR, `calendar_backup_${timestamp}.json`);
        fs.copyFileSync(filePath, backupFilePath);
        console.log(`Backup created at: ${backupFilePath}`);
    } catch (error) {
        // Non-fatal: continue even if backup fails
    }

    const { owner, repo, path: filePathInRepo, token } = getConfig();
    const octokit = new Octokit({ auth: token });

    // Load local events and metadata
    let localEventsRaw = [];
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        localEventsRaw = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        throw new Error(`Local calendar file is not valid JSON (${filePath}). Fix the file or delete it. ${error.message}`);
    }
    const localEvents = normalizeEvents(localEventsRaw);
    const localStats = fs.statSync(filePath);
    const localMtimeMs = localStats.mtimeMs;

    // Fetch remote state
    const { remoteFile, remoteEvents: remoteEventsRaw, remoteSha, remoteCommitDateMs, remoteLatestCommitSha } = await fetchRemoteFileAndCommit(
        octokit,
        owner,
        repo,
        filePathInRepo
    );
    const remoteEvents = normalizeEvents(remoteEventsRaw);

    // Helper: write local file with normalized formatting
    function writeLocal(eventsToWrite) {
        fs.writeFileSync(filePath, JSON.stringify(normalizeEvents(eventsToWrite), null, 2), 'utf8');
    }

    // Helper: update remote with retry-on-conflict
    async function updateRemoteWithRetry(eventsToPush, message, currentSha) {
        const contentB64 = Buffer.from(JSON.stringify(normalizeEvents(eventsToPush), null, 2)).toString('base64');
        try {
            const result = await octokit.repos.createOrUpdateFileContents({ owner, repo, path: filePathInRepo, message, content: contentB64, sha: currentSha || undefined });
            return (result && result.data && result.data.commit && result.data.commit.sha) ? result.data.commit.sha : null;
        } catch (error) {
            if (error.status === 409 || error.status === 422) {
                // refetch latest and retry once
                const latest = await fetchRemoteFileAndCommit(octokit, owner, repo, filePathInRepo);
                if (eventsEqual(eventsToPush, latest.remoteEvents)) {
                    return latest.remoteLatestCommitSha; // already effectively up to date
                }
                const latestB64 = Buffer.from(JSON.stringify(normalizeEvents(eventsToPush), null, 2)).toString('base64');
                const retryResult = await octokit.repos.createOrUpdateFileContents({ owner, repo, path: filePathInRepo, message, content: latestB64, sha: latest.remoteSha || undefined });
                return (retryResult && retryResult.data && retryResult.data.commit && retryResult.data.commit.sha) ? retryResult.data.commit.sha : null;
            } else if (error.status === 401) {
                throw new Error('Unauthorized: GitHub token is invalid or lacks repo scope.');
            } else if (error.status === 403) {
                throw new Error('Forbidden or rate limited by GitHub. Please try again later or check token permissions.');
            } else {
                throw error;
            }
        }
    }

    // Sync metadata helpers
    const META_PATH = path.join(SAVE_DIR, 'sync_meta.json');
    function loadSyncMeta() {
        try {
            if (fs.existsSync(META_PATH)) {
                const raw = fs.readFileSync(META_PATH, 'utf8');
                const parsed = JSON.parse(raw);
                return parsed && typeof parsed === 'object' ? parsed : { remotes: {} };
            }
        } catch {}
        return { remotes: {} };
    }
    function saveSyncMeta(meta) {
        try {
            fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2), 'utf8');
        } catch {}
    }
    function recordCommitSha(sha) {
        if (!sha) return;
        const key = `${owner}/${repo}:${filePathInRepo}`;
        const meta = loadSyncMeta();
        if (!meta.remotes) meta.remotes = {};
        const history = Array.isArray(meta.remotes[key]?.history) ? meta.remotes[key].history : [];
        const newHistory = [sha, ...history.filter(s => s && s !== sha)].slice(0, 5);
        meta.remotes[key] = { history: newHistory, updatedAt: new Date().toISOString() };
        saveSyncMeta(meta);
    }

    // Strong safety: if one side is empty and the other isn't, prefer the non-empty side
    if (localEvents.length === 0 && remoteEvents.length > 0) {
        // Local is empty, remote has data -> pull from remote to avoid data loss
        writeLocal(remoteEvents);
        recordCommitSha(remoteLatestCommitSha);
        return;
    }
    if (remoteEvents.length === 0 && localEvents.length > 0) {
        // Remote is empty/missing, local has data -> push local
        const newSha = await updateRemoteWithRetry(localEvents, 'Sync calendar data: Remote empty, uploading local', remoteSha);
        recordCommitSha(newSha);
        writeLocal(localEvents);
        return;
    }

    // If remote doesn't exist, initialize it from local
    if (!remoteFile) {
        const newSha = await updateRemoteWithRetry(localEvents, 'Initial calendar data', null);
        recordCommitSha(newSha);
        writeLocal(localEvents);
        return;
    }

    // If content already equal, ensure local formatting and exit
    if (eventsEqual(localEvents, remoteEvents)) {
        writeLocal(localEvents);
        recordCommitSha(remoteLatestCommitSha);
        return;
    }

    // Decide direction: prefer newer by timestamp when content differs
    if (localMtimeMs > remoteCommitDateMs) {
        const newSha = await updateRemoteWithRetry(localEvents, 'Sync calendar data: Local is newer', remoteSha);
        recordCommitSha(newSha);
        writeLocal(localEvents);
        return;
    }
    if (remoteCommitDateMs > localMtimeMs) {
        writeLocal(remoteEvents);
        recordCommitSha(remoteLatestCommitSha);
        return;
    }

    // Tie-breaker: timestamps equal or unknown; prioritize local but keep message explicit
    const newSha = await updateRemoteWithRetry(localEvents, 'Sync calendar data: Content differs, local prioritized', remoteSha);
    recordCommitSha(newSha);
    writeLocal(localEvents);
}

async function listRemoteCommits(limit = 5) {
    const { owner, repo, path: filePathInRepo, token } = getConfig();
    const octokit = new Octokit({ auth: token });
    try {
        const { data } = await octokit.repos.listCommits({ owner, repo, path: filePathInRepo, per_page: limit });
        return (data || []).map(c => ({ sha: c.sha, date: c.commit?.committer?.date, message: c.commit?.message }));
    } catch (error) {
        if (error.status === 404) {
            return [];
        }
        throw error;
    }
}

async function getFileContentAtRef(ref) {
    const { owner, repo, path: filePathInRepo, token } = getConfig();
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.repos.getContent({ owner, repo, path: filePathInRepo, ref });
    if (!data || data.type !== 'file') {
        throw new Error('Specified ref does not point to a file');
    }
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    return content;
}

function listLocalBackups() {
    ensureBackupDir();
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => {
                const fullPath = path.join(BACKUP_DIR, f);
                const stat = fs.statSync(fullPath);
                return { fileName: f, fullPath, mtimeMs: stat.mtimeMs };
            })
            .sort((a, b) => b.mtimeMs - a.mtimeMs);
        return files;
    } catch {
        return [];
    }
}

export { syncWithGitHub, listRemoteCommits, getFileContentAtRef, listLocalBackups };