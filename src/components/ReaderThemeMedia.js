"use client";

import { useEffect, useMemo, useRef } from "react";
import OptimizedVideo from "@/components/OptimizedVideo";
import { registerUnlockableAudio } from "@/utils/ios-media";

export function ReaderThemeVideos({
  themes = [],
  selectedThemeId,
  nextThemeId,
  className = "",
  wrapperClassName = "",
  loadCurrentImmediately = true,
  nextThemeWarmDelay = 320,
  getVideoProps = () => ({}),
}) {
  const selectedTheme = useMemo(
    () => themes.find((theme) => theme.id === selectedThemeId),
    [themes, selectedThemeId]
  );
  const nextTheme = useMemo(
    () => themes.find((theme) => theme.id === nextThemeId && theme.id !== selectedThemeId),
    [themes, nextThemeId, selectedThemeId]
  );

  return (
    <>
      {selectedTheme?.videoSrc && (
        <OptimizedVideo
          key={selectedTheme.id}
          src={selectedTheme.videoSrc}
          className={className}
          wrapperClassName={wrapperClassName}
          active
          autoPlay
          muted
          playsInline
          transparent={selectedTheme.transparent}
          preload="metadata"
          forceLoad={loadCurrentImmediately}
          disposeOnExit
          warmDelay={0}
          rootMargin="520px 0px"
          {...getVideoProps(selectedTheme)}
        />
      )}

      {nextTheme?.videoSrc && (
        <OptimizedVideo
          key={`next-${nextTheme.id}`}
          src={nextTheme.videoSrc}
          className={className}
          wrapperClassName={wrapperClassName}
          active={false}
          muted
          playsInline
          transparent={nextTheme.transparent}
          preload="metadata"
          forceLoad
          disposeOnExit
          warmDelay={nextThemeWarmDelay}
          style={{ display: "none" }}
          {...getVideoProps(nextTheme)}
        />
      )}
    </>
  );
}

export function ReaderThemeAudio({ src, audioRef, loop = true }) {
  const internalRef = useRef(null);

  useEffect(() => {
    if (audioRef && internalRef.current) {
      audioRef.current = internalRef.current;
    }
  }, [audioRef]);

  useEffect(() => {
    return registerUnlockableAudio(internalRef.current);
  }, [src]);

  if (!src) return null;

  return <audio ref={internalRef} src={src} preload="none" loop={loop} />;
}
