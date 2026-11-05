import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  ExternalLink,
  X,
  Zap,
  HelpCircle,
  GitBranch,
} from 'lucide-react';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallPwa?: () => void;
}

const GITHUB_REPO_URL = 'https://github.com/ayushmanchakraborty254-create/Resonate';
const DIRECT_APK_URL = `${GITHUB_REPO_URL}/releases/download/latest/Resonate-v1.0.0.apk`;
const RELEASES_PAGE_URL = `${GITHUB_REPO_URL}/releases`;
const ACTIONS_RUNS_URL = `${GITHUB_REPO_URL}/actions`;

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  isOpen,
  onClose,
  onInstallPwa,
}) => {
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          padding: '24px',
          color: '#f8fafc',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(34, 197, 94, 0.35)',
            }}
          >
            <Smartphone size={28} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#fff' }}>
                Download Resonate APK
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  color: '#4ade80',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                }}
              >
                v1.0.0
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Automatic CI/CD build directly from your GitHub repository
            </p>
          </div>
        </div>

        {/* Option 1: Direct Release Download */}
        <div
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#f1f5f9' }}>
              Direct GitHub Release Download
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Fastest</span>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.5 }}>
            Downloads the standalone APK compiled from the <code>latest</code> release tag on GitHub.
          </p>
          <a
            href={DIRECT_APK_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#22c55e',
              color: '#000',
              fontWeight: 700,
              fontSize: '14px',
              padding: '12px',
              borderRadius: '10px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)',
              transition: 'transform 0.2s',
            }}
          >
            <Download size={18} />
            <span>Download Resonate-v1.0.0.apk</span>
          </a>
        </div>

        {/* Option 2: GitHub Actions Artifacts (Guaranteed Fallback) */}
        <div
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Zap size={16} color="#fbbf24" />
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f1f5f9' }}>
              GitHub Actions Artifacts (No Release Needed)
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.5 }}>
            Every time code is pushed, GitHub Actions automatically compiles the APK and saves it as an artifact. You can download it directly from any workflow run!
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a
              href={ACTIONS_RUNS_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#e2e8f0',
                fontWeight: 600,
                fontSize: '13px',
                padding: '10px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              <GitBranch size={16} />
              <span>Open Actions Runs</span>
              <ExternalLink size={13} style={{ opacity: 0.6 }} />
            </a>
            <a
              href={RELEASES_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#e2e8f0',
                fontWeight: 600,
                fontSize: '13px',
                padding: '10px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              <span>GitHub Releases</span>
              <ExternalLink size={13} style={{ opacity: 0.6 }} />
            </a>
          </div>
        </div>

        {/* Option 3: Instant 1-Click PWA App Install */}
        {onInstallPwa && (
          <div
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#93c5fd' }}>
                Install Direct Web App (PWA)
              </div>
              <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 600 }}>Zero Install Time</span>
            </div>
            <p style={{ fontSize: '12px', color: '#bfdbfe', margin: '0 0 10px 0', lineHeight: 1.5 }}>
              Runs fullscreen on your phone with background audio, offline cache, and zero APK installation.
            </p>
            <button
              onClick={() => {
                onInstallPwa();
                onClose();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                fontWeight: 700,
                fontSize: '13px',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Smartphone size={16} />
              <span>Install to Home Screen</span>
            </button>
          </div>
        )}

        {/* Why does GitHub show 404? Troubleshooting Accordion */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setShowTroubleshoot(!showTroubleshoot)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'none',
              border: 'none',
              color: '#cbd5e1',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={16} color="#38bdf8" />
              <span>Why did GitHub say &ldquo;404 Didn&rsquo;t find anything here!&rdquo;?</span>
            </div>
            <span style={{ fontSize: '16px' }}>{showTroubleshoot ? '▲' : '▼'}</span>
          </button>

          {showTroubleshoot && (
            <div style={{ padding: '0 14px 14px 14px', fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
              <div style={{ marginBottom: '8px' }}>
                GitHub returns a <strong>404 error</strong> on direct release download links until the first release is officially published with that exact tag name (<code>latest</code>).
              </div>
              <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', padding: '10px', borderRadius: '8px', marginBottom: '8px' }}>
                <strong style={{ color: '#e2e8f0' }}>One-time 30-second fix to allow automatic releases:</strong>
                <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                  <li>Go to your GitHub repo ➔ <strong>Settings</strong></li>
                  <li>Click <strong>Actions</strong> ➔ <strong>General</strong> on the left</li>
                  <li>Scroll to <strong>Workflow permissions</strong></li>
                  <li>Select <strong>&ldquo;Read and write permissions&rdquo;</strong> and click <strong>Save</strong></li>
                </ol>
              </div>
              <div>
                Once enabled, GitHub Actions automatically attaches <code>Resonate-v1.0.0.apk</code> to every release upon each push! In the meantime, you can download the APK artifact directly from the <strong>Actions</strong> tab.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
