// Platform detection, native bridge, and GitHub update checker

export const CURRENT_APP_VERSION = 'v1.0.0';
export const CURRENT_BUILD_COMMIT = 'b6afd5d';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  downloadUrl?: string;
  htmlUrl: string;
}

/**
 * Detects whether Resonate is running inside the Android APK app wrapper
 * vs in standard web browsers (Chrome, Safari, desktop).
 */
export function isNativeAndroidApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).ResonateNative ||
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
 * Checks GitHub Releases API for new Resonate releases.
 * Handles semver tags as well as rolling 'latest' auto-builds intelligently.
 */
export async function checkGitHubReleaseUpdate(): Promise<UpdateInfo> {
  const current = CURRENT_APP_VERSION;
  try {
    const res = await fetch('https://api.github.com/repos/ayushmanchakraborty254-create/Resonate/releases/latest', {
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
      const currentCommit = CURRENT_BUILD_COMMIT.toLowerCase();
      const lastInstalled = (localStorage.getItem('resonate_installed_commit') || '').toLowerCase();

      // If the release commit matches our current build commit or user just installed it, no false alert!
      if (releaseCommit && (releaseCommit === currentCommit || releaseCommit === lastInstalled)) {
        hasUpdate = false;
      } else if (releaseCommit && currentCommit && releaseCommit !== currentCommit) {
        hasUpdate = true;
      } else {
        hasUpdate = false;
      }
    }

    // Find apk asset download URL if available
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
      downloadUrl: apkDownloadUrl || data.html_url,
      htmlUrl: data.html_url || 'https://github.com/ayushmanchakraborty254-create/Resonate/releases'
    };
  } catch (err) {
    console.warn('[Resonate] Update check failed or offline:', err);
    return {
      hasUpdate: false,
      currentVersion: current,
      latestVersion: current,
      releaseName: 'v1.0.0 Stable',
      releaseNotes: 'Running on current build.',
      htmlUrl: 'https://github.com/ayushmanchakraborty254-create/Resonate/releases'
    };
  }
}
