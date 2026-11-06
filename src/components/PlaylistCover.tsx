import React, { useState } from 'react';
import { Music } from 'lucide-react';

interface PlaylistCoverProps {
  tracks?: Array<{ thumbnailUrl?: string }>;
  thumbnailUrl?: string;
  name?: string;
  creator?: string;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  rounded?: number | string;
  onClick?: () => void;
}

const QUAD_GRADIENTS = [
  'linear-gradient(135deg, #f43f5e 0%, #a855f7 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
];

interface CollageTileProps {
  url?: string;
  index: number;
}

const CollageTile: React.FC<CollageTileProps> = ({ url, index }) => {
  const [hasError, setHasError] = useState(false);

  if (url && !hasError) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setHasError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: QUAD_GRADIENTS[index % QUAD_GRADIENTS.length],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Music size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
    </div>
  );
};

export const PlaylistCover: React.FC<PlaylistCoverProps> = ({
  tracks,
  thumbnailUrl,
  name = 'Playlist',
  size = '100%',
  className = '',
  style = {},
  rounded = '10px',
  onClick,
}) => {
  const validThumbnails = (tracks || [])
    .map((t) => t.thumbnailUrl)
    .filter((url): url is string => Boolean(url));

  const containerStyle: React.CSSProperties = {
    width: typeof size === 'number' ? `${size}px` : size,
    height: typeof size === 'number' ? `${size}px` : size,
    aspectRatio: '1',
    borderRadius: rounded,
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.45)',
    ...style,
  };

  // 1. If 4 or more track thumbnails are available, create a clean 2x2 collage
  if (validThumbnails.length >= 4) {
    return (
      <div
        className={`playlist-cover-collage ${className}`}
        style={containerStyle}
        onClick={onClick}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: '1px',
            backgroundColor: '#0a0a0a',
            width: '100%',
            height: '100%',
          }}
        >
          {validThumbnails.slice(0, 4).map((thumb, index) => (
            <CollageTile key={index} url={thumb} index={index} />
          ))}
        </div>
      </div>
    );
  }

  // 2. Single custom thumbnail URL or 1-3 tracks -> Render clean single artwork
  const singleImage = thumbnailUrl || (validThumbnails.length > 0 ? validThumbnails[0] : undefined);

  if (singleImage) {
    return (
      <div
        className={`playlist-cover-single ${className}`}
        style={{
          ...containerStyle,
          backgroundColor: '#181a20',
        }}
        onClick={onClick}
      >
        <img
          src={singleImage}
          alt={name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
    );
  }

  // 3. Fallback when playlist has no tracks and no thumbnail -> Sleek, clean card with Resonate logo
  return (
    <div
      className={`playlist-cover-empty ${className}`}
      style={{
        ...containerStyle,
        background: 'linear-gradient(135deg, #181920 0%, #0d0e12 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '8px',
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
      onClick={onClick}
    >
      <img
        src="/logo.png"
        alt="Resonate"
        style={{
          width: typeof size === 'number' ? `${Math.max(20, Math.floor(size / 3))}px` : '42%',
          height: typeof size === 'number' ? `${Math.max(20, Math.floor(size / 3))}px` : '42%',
          borderRadius: '8px',
          objectFit: 'cover',
          marginBottom: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}
      />
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.7)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%',
          padding: '0 4px',
        }}
      >
        {name}
      </span>
    </div>
  );
};
