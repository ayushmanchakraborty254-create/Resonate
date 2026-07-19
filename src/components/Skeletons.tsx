import React from 'react';

export const SongRowSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)', margin: '4px 0' }} className="pulse">
      <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)' }}></div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ width: '40%', height: '14px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.07)' }}></div>
        <div style={{ width: '25%', height: '10px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.04)' }}></div>
      </div>
      <div style={{ width: '32px', height: '12px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.05)' }}></div>
    </div>
  );
};

export const PlaylistCardSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.03)' }} className="pulse">
      <div style={{ width: '100%', aspectRatio: '1', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)' }}></div>
      <div style={{ width: '70%', height: '14px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.07)' }}></div>
      <div style={{ width: '40%', height: '10px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.04)' }}></div>
    </div>
  );
};

export const LibraryCategorySkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)' }} className="pulse">
      <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)' }}></div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ width: '50%', height: '16px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.08)' }}></div>
        <div style={{ width: '30%', height: '12px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.04)' }}></div>
      </div>
    </div>
  );
};
