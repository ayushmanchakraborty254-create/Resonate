import React, { useState } from 'react';
import { Play, Sparkles } from 'lucide-react';

interface ArtisticCoverProps {
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  tag?: string;
  gradient?: string;
  accentColor?: string;
  size?: number | string;
  aspectRatio?: string;
  rounded?: string;
  showVinyl?: boolean;
  showBadge?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

// Deterministic aesthetic gradient generator based on title string
function generateAlgorithmicGradient(str: string): { gradient: string; accent: string; tag: string } {
  const PRESETS = [
    {
      gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)',
      accent: 'rgba(236, 72, 153, 0.45)',
      tag: 'SYNTH VIBE',
    },
    {
      gradient: 'linear-gradient(135deg, #f43f5e 0%, #a855f7 50%, #3b82f6 100%)',
      accent: 'rgba(244, 63, 94, 0.45)',
      tag: 'BOLLYWOOD GLOW',
    },
    {
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #4f46e5 100%)',
      accent: 'rgba(6, 182, 212, 0.45)',
      tag: 'COSMIC DRIFT',
    },
    {
      gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)',
      accent: 'rgba(16, 185, 129, 0.45)',
      tag: 'AURORA CHILL',
    },
    {
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #7c2d12 100%)',
      accent: 'rgba(245, 158, 11, 0.45)',
      tag: 'GOLDEN RETRO',
    },
    {
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #c084fc 40%, #1e1b4b 100%)',
      accent: 'rgba(139, 92, 246, 0.45)',
      tag: 'NEO CLASSIC',
    },
    {
      gradient: 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 60%, #0f172a 100%)',
      accent: 'rgba(220, 38, 38, 0.45)',
      tag: 'CINEMATIC HEAT',
    },
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PRESETS.length;
  return PRESETS[index];
}

export const ArtisticCover: React.FC<ArtisticCoverProps> = ({
  title,
  subtitle,
  thumbnailUrl,
  tag,
  gradient,
  accentColor,
  size = '100%',
  aspectRatio = '1',
  rounded = '10px',
  showVinyl = false,
  showBadge = true,
  className = '',
  style = {},
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Compute preset based on title if gradient/accent is not manually supplied
  const computed = generateAlgorithmicGradient(title || 'Resonate Music');
  const activeGradient = gradient || computed.gradient;
  const activeAccent = accentColor || computed.accent;
  const activeTag = tag || computed.tag;

  // Initials for stylized monogram
  const initials = (title || 'R')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div
      className={`artistic-cover-root ${className}`}
      style={{
        position: 'relative',
        width: typeof size === 'number' ? `${size}px` : size,
        aspectRatio,
        cursor: 'pointer',
        ...style,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* 1. Interactive 3D Vinyl Disc Peek (Slides out smoothly behind the sleeve) */}
      {showVinyl && (
        <div
          className="vinyl-disc"
          style={{
            position: 'absolute',
            top: '4%',
            bottom: '4%',
            right: 0,
            width: '92%',
            aspectRatio: '1',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #262626 0%, #171717 35%, #0a0a0a 70%, #000000 100%)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.75)',
            transform: isHovered
              ? 'translateX(34px) rotate(45deg)'
              : 'translateX(0px) rotate(0deg)',
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            zIndex: 1,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Vinyl Groove Rings Texture */}
          <div
            style={{
              position: 'absolute',
              inset: '8px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: 'inset 0 0 0 8px rgba(255, 255, 255, 0.02), inset 0 0 0 16px rgba(0, 0, 0, 0.6), inset 0 0 0 24px rgba(255, 255, 255, 0.03)',
            }}
          />
          {/* Vinyl Gloss Sheen (Ray effect) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'conic-gradient(from 45deg, transparent 0deg, rgba(255, 255, 255, 0.06) 60deg, transparent 120deg, rgba(255, 255, 255, 0.06) 240deg, transparent 300deg)',
            }}
          />
          {/* Center Vinyl Label with Accent Color */}
          <div
            style={{
              width: '36%',
              height: '36%',
              borderRadius: '50%',
              background: activeGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
              position: 'relative',
            }}
          >
            {/* Center Spindle Hole */}
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#0a0a0a',
                border: '1.5px solid rgba(255,255,255,0.4)',
              }}
            />
          </div>
        </div>
      )}

      {/* 2. Main Sleeve Jacket (Front Cover) */}
      <div
        className="sleeve-jacket"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: rounded,
          overflow: 'hidden',
          zIndex: 2,
          background: activeGradient,
          boxShadow: isHovered
            ? `0 16px 36px ${activeAccent}, 0 4px 16px rgba(0, 0, 0, 0.6)`
            : '0 6px 18px rgba(0, 0, 0, 0.4)',
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease',
        }}
      >
        {/* Has valid image and no error: Render Image with subtle artistic grade */}
        {thumbnailUrl && !imageError ? (
          <>
            <img
              src={thumbnailUrl}
              alt={title}
              onError={() => setImageError(true)}
              onLoad={(e) => {
                const img = e.currentTarget;
                // YouTube returns a 120x90 placeholder when a video/thumbnail is missing or invalid
                if (img.naturalWidth === 120 && img.naturalHeight === 90) {
                  setImageError(true);
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transition: 'transform 0.4s ease, filter 0.3s ease',
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                filter: isHovered ? 'brightness(0.78)' : 'brightness(0.96)',
              }}
            />
            {/* Artistic gradient vignette overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.4) 100%)',
                pointerEvents: 'none',
              }}
            />
          </>
        ) : (
          /* Procedural Fallback Cover: Dynamic Artwork that NEVER fails or looks empty */
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: activeGradient,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '14px',
              color: '#ffffff',
              overflow: 'hidden',
            }}
          >
            {/* Background Vinyl Ring Accents */}
            <div
              style={{
                position: 'absolute',
                right: '-30px',
                bottom: '-30px',
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                border: '1.5px solid rgba(255, 255, 255, 0.15)',
                boxShadow: 'inset 0 0 0 20px rgba(255, 255, 255, 0.04), inset 0 0 0 40px rgba(255, 255, 255, 0.03)',
                pointerEvents: 'none',
              }}
            />

            {/* Equalizer Wave Pattern in Background */}
            <div
              style={{
                position: 'absolute',
                left: '14px',
                bottom: '16px',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '3px',
                height: '24px',
                opacity: 0.3,
                pointerEvents: 'none',
              }}
            >
              {[14, 22, 10, 18, 24, 12, 20, 8, 16].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: '3px',
                    height: `${h}px`,
                    backgroundColor: '#fff',
                    borderRadius: '2px',
                  }}
                />
              ))}
            </div>

            {/* Large Typography Monogram */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '46px',
                fontWeight: 900,
                letterSpacing: '-2px',
                color: 'rgba(255, 255, 255, 0.18)',
                userSelect: 'none',
                pointerEvents: 'none',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {initials}
            </div>

            {/* Bottom text info for procedurally generated cover */}
            <div style={{ marginTop: 'auto', zIndex: 3, position: 'relative' }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#ffffff',
                  textShadow: '0 2px 6px rgba(0,0,0,0.8)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {title}
              </div>
              {subtitle && (
                <div
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: '2px',
                  }}
                >
                  {subtitle}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Floating Genre / Vibe Badge Pill (Top Left) */}
        {showBadge && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              zIndex: 4,
            }}
          >
            <Sparkles size={10} style={{ color: '#fbbf24' }} />
            <span>{activeTag}</span>
          </div>
        )}

        {/* 4. Lossless / Hi-Res Audio Stamp (Bottom Right on Hover) */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '4px',
            padding: '2px 5px',
            fontSize: '9px',
            fontWeight: 800,
            letterSpacing: '0.8px',
            color: '#e2e8f0',
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? 'translateY(0)' : 'translateY(4px)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            zIndex: 4,
          }}
        >
          HI-RES
        </div>

        {/* 5. Center Play Button Overlay on Hover */}
        <div
          className="play-hover-btn"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: isHovered ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.75)',
            opacity: isHovered ? 1 : 0,
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 0, 0, 0.9)',
            boxShadow: '0 8px 24px rgba(255, 0, 0, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 5,
          }}
        >
          <Play size={20} fill="#ffffff" style={{ transform: 'translateX(1.5px)' }} />
        </div>
      </div>
    </div>
  );
};
