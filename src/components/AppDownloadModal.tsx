import React, { useState } from 'react';
import {
  Download,
  X,
  Copy,
  Check,
  GitBranch,
  QrCode,
  Monitor
} from 'lucide-react';
import logoImg from '../assets/logo.png';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallPwa?: () => void;
}

const GITHUB_REPO_URL = 'https://github.com/ayushmanchakraborty254-create/Resonate';
const LATEST_RELEASE_URL = `${GITHUB_REPO_URL}/releases/latest`;
const QR_CODE_API_URL = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(LATEST_RELEASE_URL)}&bgcolor=ffffff&color=000000&margin=10`;

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  isOpen,
  onClose,
  onInstallPwa,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyRepo = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(GITHUB_REPO_URL);
      } else {
        const temp = document.createElement('input');
        temp.value = GITHUB_REPO_URL;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch (_) {}
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
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
          maxWidth: '460px',
          maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: '#0d1117',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8)',
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
            top: '18px',
            right: '18px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
          <img
            src={logoImg}
            alt="Resonate"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              objectFit: 'cover',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.5)',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.3px' }}>
                Install Resonate App
              </h2>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Get the standalone app for Android & Desktop
            </p>
          </div>
        </div>

        {/* QR Code Card for Mobile APK Download */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '18px',
            textAlign: 'center',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#38bdf8', fontWeight: 700, fontSize: '14px' }}>
            <QrCode size={18} />
            <span>Scan to Download Android APK</span>
          </div>

          {/* QR Code Container */}
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '12px',
              borderRadius: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
              marginBottom: '12px',
            }}
          >
            <img
              src={QR_CODE_API_URL}
              alt="Scan QR code for Resonate APK"
              style={{
                width: '180px',
                height: '180px',
                display: 'block',
                borderRadius: '8px',
              }}
            />
          </div>

          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 14px 0', maxWidth: '300px', lineHeight: 1.45 }}>
            Scan with your phone camera to open the GitHub Release page and download the APK directly.
          </p>

          {/* Direct Download Button */}
          <a
            href={LATEST_RELEASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#e50914',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '14px',
              padding: '11px 16px',
              borderRadius: '12px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(229, 9, 20, 0.4)',
              transition: 'transform 0.15s ease',
            }}
          >
            <Download size={17} />
            <span>Go to Latest APK Release</span>
          </a>
        </div>

        {/* GitHub Repository Card with Copy Link */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '14px 16px',
            marginBottom: onInstallPwa ? '14px' : '0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#e2e8f0', fontWeight: 600, fontSize: '13px' }}>
            <GitBranch size={16} />
            <span>GitHub Repository</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '8px 12px',
              borderRadius: '10px',
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: '12px',
                color: '#94a3b8',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'monospace',
              }}
            >
              {GITHUB_REPO_URL}
            </span>

            <button
              onClick={handleCopyRepo}
              style={{
                backgroundColor: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                border: copied ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
                color: copied ? '#4ade80' : '#fff',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {copied ? (
                <>
                  <Check size={13} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Optional Desktop PWA Install Button */}
        {onInstallPwa && (
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
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#e2e8f0',
              fontWeight: 600,
              fontSize: '13px',
              padding: '10px 14px',
              borderRadius: '12px',
              cursor: 'pointer',
              marginTop: '12px',
            }}
          >
            <Monitor size={15} style={{ color: '#38bdf8' }} />
            <span>Install as Desktop Standalone App</span>
          </button>
        )}
      </div>
    </div>
  );
};
