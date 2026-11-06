import React, { useEffect, useMemo, useRef, useState } from 'react';
import { hasIndicScript, transliterateToRomanized } from '../utils/transliterate';

export interface LyricLine {
  text: string;
  startTime: number;
  endTime: number;
  isHeader?: boolean;
}

interface KaraokeLyricsProps {
  lyrics?: string;
  progress: number;
  duration: number;
  onSeek?: (seconds: number) => void;
  compact?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
}

/**
 * Parses raw lyric string into synchronized LyricLine entries.
 * Automatically handles standard LRC timestamps ([mm:ss.xx]) or
 * smoothly distributes plain-text lyrics across the track duration.
 */
export function parseSynchronizedLyrics(rawLyrics: string, trackDuration: number): LyricLine[] {
  if (!rawLyrics || !rawLyrics.trim()) return [];

  const rawLines = rawLyrics.split('\n').map((l) => l.trim()).filter(Boolean);
  const hasLrc = rawLines.some((line) => /\[\d{2}:\d{2}/.test(line));

  if (hasLrc) {
    const parsed: LyricLine[] = [];
    for (const line of rawLines) {
      const match = /\[(\d{2}):(\d{2})(?:\.(\d+))?\](.*)/.exec(line);
      if (match) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const ms = match[3] ? parseFloat(`0.${match[3]}`) : 0;
        const startTime = mins * 60 + secs + ms;
        const text = match[4].trim();
        if (text) {
          parsed.push({ text, startTime, endTime: startTime + 3.5 });
        }
      } else if (line.startsWith('[') && line.endsWith(']')) {
        parsed.push({ text: line, startTime: 0, endTime: 0, isHeader: true });
      }
    }

    // Sort by startTime
    parsed.sort((a, b) => a.startTime - b.startTime);

    // Fill realistic end times with intelligent instrumental gap handling
    for (let i = 0; i < parsed.length; i++) {
      if (!parsed[i].isHeader) {
        if (i + 1 < parsed.length && !parsed[i + 1].isHeader) {
          const gap = parsed[i + 1].startTime - parsed[i].startTime;
          // If gap is normal singing cadence (<= 7s), line runs until next line begins.
          // If there is an instrumental solo or interlude (> 7s), cap line ending at startTime + 5.5s
          parsed[i].endTime = gap <= 7 ? parsed[i + 1].startTime : parsed[i].startTime + Math.min(gap, 5.5);
        } else {
          parsed[i].endTime = parsed[i].startTime + 5;
        }
      }
    }
    return parsed;
  }

  // Plain-text distribution
  const nonHeaderLines: string[] = [];
  rawLines.forEach((line) => {
    nonHeaderLines.push(line);
  });

  const totalLines = nonHeaderLines.length;
  if (totalLines === 0) return [];

  const safeDuration = Math.max(30, trackDuration || 180);
  const leadIn = Math.min(5, safeDuration * 0.05); // Intro duration
  const availableTime = safeDuration - leadIn - 5;
  const lineSpan = availableTime / totalLines;

  return nonHeaderLines.map((text, idx) => {
    const isHeader = text.startsWith('[') && text.endsWith(']');
    const startTime = leadIn + idx * lineSpan;
    const endTime = startTime + lineSpan;
    return {
      text,
      startTime,
      endTime,
      isHeader,
    };
  });
}

export const KaraokeLyrics: React.FC<KaraokeLyricsProps> = ({
  lyrics = '',
  progress,
  duration,
  onSeek,
  compact = false,
  fontSize = 'medium',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(
    () => parseSynchronizedLyrics(lyrics, duration),
    [lyrics, duration]
  );

  // Find active line
  const activeIndex = useMemo(() => {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.isHeader) continue;
      if (progress >= line.startTime && progress < line.endTime) {
        return i;
      }
    }
    // Fallback: closest past line
    let closest = -1;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].isHeader && progress >= lines[i].startTime) {
        closest = i;
      }
    }
    return closest;
  }, [lines, progress]);

  // Center active line in container smoothly
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  if (!lyrics || lines.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '40px 20px',
          color: 'rgba(255, 255, 255, 0.45)',
          fontSize: compact ? '14px' : '18px',
          textAlign: 'center',
        }}
      >
        Lyrics aren't available for this track yet. Enjoy the music!
      </div>
    );
  }

  const isIndic = useMemo(() => hasIndicScript(lyrics), [lyrics]);
  const [scriptMode, setScriptMode] = useState<'english' | 'native'>('english');

  // Active line progress percentage for word-by-word karaoke sweep
  const activeLine = activeIndex >= 0 ? lines[activeIndex] : null;
  const lineProgressRatio = activeLine && !activeLine.isHeader
    ? Math.max(0, Math.min(1, (progress - activeLine.startTime) / Math.max(0.1, activeLine.endTime - activeLine.startTime)))
    : 0;

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: compact ? '20px 12px 60px 12px' : '40px 24px 120px 24px',
        scrollBehavior: 'smooth',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Script / Language Toggle for Multilingual Songs (Hindi/Bengali -> Romanized English) */}
      {isIndic && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '3px' }}>
            <button
              onClick={() => setScriptMode('english')}
              style={{
                border: 'none',
                background: scriptMode === 'english' ? 'var(--yt-accent, #e50914)' : 'transparent',
                color: '#fff',
                borderRadius: '16px',
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              English (Hinglish/Banglish)
            </button>
            <button
              onClick={() => setScriptMode('native')}
              style={{
                border: 'none',
                background: scriptMode === 'native' ? 'var(--yt-accent, #e50914)' : 'transparent',
                color: '#fff',
                borderRadius: '16px',
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Native Script
            </button>
          </div>
        </div>
      )}

      {lines.map((line, idx) => {
        const isActive = idx === activeIndex;
        const isPast = idx < activeIndex;

        const displayText = isIndic && scriptMode === 'english' && !line.isHeader
          ? transliterateToRomanized(line.text)
          : line.text;

        if (line.isHeader) {
          return (
            <div
              key={idx}
              style={{
                fontSize: compact ? '11px' : '13px',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: 'var(--yt-accent)',
                padding: '16px 0 6px 0',
                opacity: 0.8,
              }}
            >
              {displayText}
            </div>
          );
        }

        // Active line with word-by-word progressive gradient reveal
        const words = displayText.split(' ');

        return (
          <div
            key={idx}
            ref={isActive ? activeLineRef : null}
            onClick={() => onSeek && onSeek(line.startTime)}
            style={{
              padding: compact ? '8px 0' : '14px 0',
              cursor: onSeek ? 'pointer' : 'default',
              userSelect: 'none',
              transform: isActive ? (compact ? 'scale(1.02)' : 'scale(1.04) translateX(8px)') : 'scale(1)',
              transformOrigin: 'left center',
              transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease',
              lineHeight: 1.45,
            }}
          >
            {isActive ? (
              <span
                style={{
                  fontSize: fontSize === 'large' ? '34px' : fontSize === 'medium' ? '26px' : '18px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                {words.map((word, wIdx) => {
                  const wStart = wIdx / words.length;
                  const wEnd = (wIdx + 1) / words.length;
                  let wordPercent = 0;
                  if (lineProgressRatio >= wEnd) {
                    wordPercent = 100;
                  } else if (lineProgressRatio <= wStart) {
                    wordPercent = 0;
                  } else {
                    wordPercent = ((lineProgressRatio - wStart) / (wEnd - wStart)) * 100;
                  }

                  const isWordSung = wordPercent >= 35;

                  return (
                    <span
                      key={wIdx}
                      style={{
                        color: isWordSung ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                        textShadow: isWordSung ? '0 0 16px rgba(255, 255, 255, 0.75)' : 'none',
                        transition: 'color 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), text-shadow 0.2s ease',
                      }}
                    >
                      {word}
                    </span>
                  );
                })}
              </span>
            ) : (
              <span
                style={{
                  fontSize: fontSize === 'large' ? (compact ? '20px' : '24px') : fontSize === 'medium' ? '19px' : '15px',
                  fontWeight: 600,
                  color: isPast ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.25)',
                  transition: 'color 0.3s ease',
                }}
              >
                {displayText}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
