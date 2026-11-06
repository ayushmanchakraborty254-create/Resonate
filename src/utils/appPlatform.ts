// Platform detection and GitHub update checker

export const CURRENT_APP_VERSION = 'v1.0.0';

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
 * Checks GitHub Releases API for new Resonate releases
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
    const tag = (data.tag_name || '').trim();
    const cleanTag = tag.replace(/^v/, '');
    const cleanCurrent = current.replace(/^v/, '');

    // Compare versions (semver-like)
    const hasUpdate = cleanTag !== '' && cleanTag !== cleanCurrent && cleanTag > cleanCurrent;

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
      latestVersion: tag || current,
      releaseName: data.name || tag || 'Latest Release',
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

