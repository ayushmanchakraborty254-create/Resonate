// Platform detection, native bridge, and GitHub update checker

export const CURRENT_APP_VERSION = 'v1.0.0';
export const CURRENT_BUILD_COMMIT = 'a89a9ef';
export const GITHUB_REPO = 'ayushmanchakraborty254-create/Resonate';
export const DEFAULT_APK_DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/Resonate-v1.0.0.apk`;
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  downloadUrl?: string;
  htmlUrl: string;
  releaseCommit?: string;
}

/**
 * Detects whether Resonate is running inside the Android APK app wrapper
 * vs in standard web browsers (Chrome, Safari, desktop).
 */
export function isNativeAndroidApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).ResonateNative ||
    (window as any).ResonateNativeSecure ||
    navigator.userAgent.includes('ResonateNativeApp') ||
    window.location.hostname === 'resonate.app' ||
    window.location.protocol === 'file:'
  );
}

/**
 * Opens external URLs safely via Android Intent (in native app) or window.open (in browser).
 * Prevents Android WebView from dropping blank links.
 */
export function openExternalUrl(url: string): void {
  if (typeof window !== 'undefined' && (window as any).ResonateNative?.openExternalUrl) {
    (window as any).ResonateNative.openExternalUrl(url);
  } else if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function parseSemVer(v: string): [number, number, number] | null {
  const match = v.trim().replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

function compareSemVer(a: [number, number, number], b: [number, number, number]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

/**
 * Checks GitHub Releases and raw version metadata for new Resonate releases.
 * Uses a robust dual-source check (raw CDN version.json + GitHub Releases API)
 * to prevent failing on GitHub rate limits (HTTP 403).
 */
export async function checkGitHubReleaseUpdate(): Promise<UpdateInfo> {
  const current = CURRENT_APP_VERSION;
  const currentCommit = CURRENT_BUILD_COMMIT.toLowerCase();
  const lastInstalled = (localStorage.getItem('resonate_installed_commit') || '').toLowerCase();

  // 1. First attempt: check latest release version.json asset (published by GitHub Actions on every build)
  try {
    const rawRes = await fetch(
      `https://github.com/${GITHUB_REPO}/releases/download/latest/version.json?t=${Date.now()}`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (rawRes.ok) {
      const vData = await rawRes.json();
      const remoteCommit = (vData.commitSha || '').trim().toLowerCase();
      const remoteVersion = (vData.versionName ? `v${vData.versionName}` : vData.version || current).trim();
      const isDismissed = localStorage.getItem('resonate_dismissed_update') === remoteCommit;

      let hasUpdate = false;
      if (!isDismissed && remoteCommit && remoteCommit !== currentCommit && remoteCommit !== lastInstalled) {
        hasUpdate = true;
      }

      return {
        hasUpdate,
        currentVersion: current,
        latestVersion: remoteVersion,
        releaseName: vData.commitMessage || `Resonate Auto-Build (${remoteCommit || 'latest'})`,
        releaseNotes: vData.commitMessage || 'Performance optimizations, background playback, and mobile refinements.',
        downloadUrl: vData.downloadUrl || DEFAULT_APK_DOWNLOAD_URL,
        htmlUrl: GITHUB_RELEASES_URL,
        releaseCommit: remoteCommit
      };
    }
  } catch (_) {
    // Release asset check failed, fall through to GitHub Releases API
  }

  // 2. Second attempt: GitHub Releases API
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      },
      signal: AbortSignal.timeout(3500)
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned status ${res.status}`);
    }

    const data = await res.json();
    const rawTag = (data.tag_name || '').trim();
    const releaseName = (data.name || rawTag || 'Latest Release').trim();
    const releaseCommit = (releaseName.match(/\(([a-f0-9]{7,40})\)/i)?.[1] || data.target_commitish || '').toLowerCase();

    // Check version numbers
    const remoteSem = parseSemVer(rawTag) || parseSemVer(releaseName);
    const localSem = parseSemVer(current) || [1, 0, 0];

    let hasUpdate = false;
    if (remoteSem) {
      hasUpdate = compareSemVer(remoteSem, localSem) > 0;
    } else if (rawTag.toLowerCase().includes('latest') || releaseName.toLowerCase().includes('auto-build')) {
      const isDismissed = localStorage.getItem('resonate_dismissed_update') === releaseCommit;

      if (isDismissed || (releaseCommit && (releaseCommit === currentCommit || releaseCommit === lastInstalled))) {
        hasUpdate = false;
      } else if (releaseCommit && currentCommit && releaseCommit !== currentCommit) {
        hasUpdate = true;
      }
    }

    let apkDownloadUrl: string | undefined;
    if (Array.isArray(data.assets)) {
      const apkAsset = data.assets.find((a: any) => (a.name || '').toLowerCase().endsWith('.apk'));
      if (apkAsset) {
        apkDownloadUrl = apkAsset.browser_download_url;
      }
    }

    return {
      hasUpdate,
      currentVersion: current,
      latestVersion: rawTag || current,
      releaseName: releaseName,
      releaseNotes: data.body || 'No release notes provided.',
      downloadUrl: apkDownloadUrl || DEFAULT_APK_DOWNLOAD_URL,
      htmlUrl: data.html_url || GITHUB_RELEASES_URL,
      releaseCommit: releaseCommit
    };
  } catch (err) {
    console.warn('[Resonate] Update check fallback:', err);
    return {
      hasUpdate: false,
      currentVersion: current,
      latestVersion: current,
      releaseName: 'Resonate v1.0.0',
      releaseNotes: 'Running on current build.',
      downloadUrl: DEFAULT_APK_DOWNLOAD_URL,
      htmlUrl: GITHUB_RELEASES_URL
    };
  }
}
