// Platform detection, native bridge, and GitHub update checker
import { isSecureNativeBridgeAvailable, sendNativeMessage } from './nativeBridge';

export const CURRENT_APP_VERSION = 'v1.0.1';
export const CURRENT_VERSION_CODE = 41;
export const CURRENT_BUILD_COMMIT = 'd15eb9f';
export const GITHUB_REPO = 'ayushmanchakraborty254-create/Resonate';
export const DEFAULT_APK_DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/Resonate-v1.0.1.apk`;
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  currentVersionCode?: number;
  currentCommit?: string;
  latestVersion: string;
  latestVersionCode?: number;
  latestCommit?: string;
  releaseName: string;
  releaseNotes: string;
  downloadUrl?: string;
  htmlUrl: string;
  isNative?: boolean;
}

export interface NativeAppVersion {
  versionCode: number;
  versionName: string;
  gitCommitSha: string;
  packageName: string;
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
 * Retrieves the genuine installed package metadata directly from Android's PackageManager.
 */
export async function getNativeAppVersion(): Promise<NativeAppVersion | null> {
  if (isNativeAndroidApp() && isSecureNativeBridgeAvailable()) {
    try {
      const res = await sendNativeMessage<any>('getAppVersion', {}, 3000);
      if (res && res.success) {
        return {
          versionCode: Number(res.versionCode) || CURRENT_VERSION_CODE,
          versionName: String(res.versionName || CURRENT_APP_VERSION.replace(/^v/, '')),
          gitCommitSha: String(res.gitCommitSha || CURRENT_BUILD_COMMIT),
          packageName: String(res.packageName || 'com.resonate.app')
        };
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Checks GitHub Releases and raw version metadata for new Resonate releases.
 * In native Android app, uses the native bridge (bypassing browser CORS completely).
 * In browser, queries GitHub Releases API with strict error reporting.
 */
export async function checkGitHubReleaseUpdate(): Promise<UpdateInfo> {
  const currentVer = CURRENT_APP_VERSION;

  // 1. In native Android app: use the native bridge HTTP fetcher (no CORS, direct packageInfo check)
  if (isNativeAndroidApp() && isSecureNativeBridgeAvailable()) {
    try {
      const res = await sendNativeMessage<any>('checkUpdate', {}, 10000);
      if (res && res.success) {
        const curCode = Number(res.installedVersionCode) || CURRENT_VERSION_CODE;
        const curName = res.installedVersionName ? `v${res.installedVersionName}` : currentVer;
        const curSha = res.installedCommitSha || CURRENT_BUILD_COMMIT;
        const latCode = Number(res.latestVersionCode) || curCode;
        const latName = res.latestVersionName ? `v${res.latestVersionName}` : curName;
        const latSha = res.latestCommitSha || curSha;

        return {
          hasUpdate: Boolean(res.hasUpdate),
          currentVersion: curName,
          currentVersionCode: curCode,
          currentCommit: curSha,
          latestVersion: latName,
          latestVersionCode: latCode,
          latestCommit: latSha,
          releaseName: res.latestVersionName ? `Resonate ${latName} (Build #${latCode})` : 'Resonate Update',
          releaseNotes: res.releaseNotes || 'Bug fixes, performance improvements, and background audio refinements.',
          downloadUrl: res.downloadUrl || DEFAULT_APK_DOWNLOAD_URL,
          htmlUrl: GITHUB_RELEASES_URL,
          isNative: true
        };
      } else {
        throw new Error(res?.error || 'Native bridge reported check update failure');
      }
    } catch (bridgeErr: any) {
      console.warn('[Resonate] Native update check failed:', bridgeErr);
      throw bridgeErr;
    }
  }

  // 2. In Browser / Web: query GitHub Releases API directly
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      },
      signal: AbortSignal.timeout(5000)
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
    const localSem = parseSemVer(currentVer) || [1, 0, 1];

    let hasUpdate = false;
    if (remoteSem) {
      hasUpdate = compareSemVer(remoteSem, localSem) > 0;
    } else if (releaseCommit && releaseCommit !== CURRENT_BUILD_COMMIT.toLowerCase()) {
      hasUpdate = true;
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
      currentVersion: currentVer,
      currentVersionCode: CURRENT_VERSION_CODE,
      currentCommit: CURRENT_BUILD_COMMIT,
      latestVersion: rawTag ? (rawTag.startsWith('v') ? rawTag : `v${rawTag}`) : currentVer,
      latestVersionCode: CURRENT_VERSION_CODE,
      latestCommit: releaseCommit,
      releaseName: releaseName,
      releaseNotes: data.body || 'No release notes provided.',
      downloadUrl: apkDownloadUrl || DEFAULT_APK_DOWNLOAD_URL,
      htmlUrl: data.html_url || GITHUB_RELEASES_URL,
      isNative: false
    };
  } catch (err: any) {
    console.error('[Resonate] Web update check error:', err);
    throw err;
  }
}

/**
 * Downloads and installs the APK update natively via Android package installer handoff.
 */
export async function downloadAndInstallNativeUpdate(
  downloadUrl: string,
  onProgress?: (percent: number, bytesRead: number, totalBytes: number) => void
): Promise<{ success: boolean; error?: string }> {
  if (!isSecureNativeBridgeAvailable()) {
    openExternalUrl(downloadUrl);
    return { success: true };
  }

  return sendNativeMessage<{ success: boolean; error?: string }>(
    'downloadAndInstallUpdate',
    { downloadUrl },
    300000, // 5 min timeout for slow networks
    (progressData) => {
      if (onProgress && typeof progressData.percent === 'number') {
        onProgress(progressData.percent, progressData.bytesRead || 0, progressData.totalBytes || 0);
      }
    }
  );
}

/**
 * Triggers package installation of an already-downloaded update APK.
 */
export async function installDownloadedApkNative(): Promise<{ success: boolean; error?: string }> {
  if (isSecureNativeBridgeAvailable()) {
    return sendNativeMessage<{ success: boolean; error?: string }>('installDownloadedApk');
  }
  return { success: false, error: 'Not running in native app' };
}
