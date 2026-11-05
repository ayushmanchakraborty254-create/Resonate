import React from 'react';
import { Music } from 'lucide-react';

interface PlaylistCoverProps {
  tracks?: Array<{ thumbnailUrl?: string }>;
  thumbnailUrl?: string;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  rounded?: number | string;
}

export const PlaylistCover: React.FC<PlaylistCoverProps> = ({
  tracks,
  thumbnailUrl,
  size = '100%',
  className = '',
  style = {},
  rounded = '8px',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
    ...style,
  };

  // 1. If 4 or more track thumbnails are available, create 2x2 collage
  if (validThumbnails.length >= 4) {
    return (
      <div className={`playlist-cover-collage ${className}`} style={containerStyle}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            width: '100%',
            height: '100%',
          }}
        >
          {validThumbnails.slice(0, 4).map((thumb, index) => (
            <img
              key={index}
              src={thumb}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => {
                // Fallback to placeholder color on image load failure
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // 2. Single custom thumbnail URL
  const singleImage = thumbnailUrl || (validThumbnails.length > 0 ? validThumbnails[0] : null);

  if (singleImage) {
    return (
      <div className={`playlist-cover-single ${className}`} style={containerStyle}>
        <img
          src={singleImage}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // 3. Fallback placeholder
  return (
    <div className={`playlist-cover-placeholder ${className}`} style={containerStyle}>
      <Music size={typeof size === 'number' ? Math.round(size * 0.4) : 32} style={{ color: 'var(--yt-text-secondary)', opacity: 0.6 }} />
    </div>
  );
};

