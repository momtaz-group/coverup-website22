"use client";

import OptimizedVideo from "@/components/OptimizedVideo";

export default function MBTICharacterVideo({
  src,
  active = true,
  className = "",
  wrapperClassName = "",
  transparent = true,
  onEnded,
  ...props
}) {
  if (!src) return null;

  return (
    <OptimizedVideo
      src={src}
      active={active}
      autoPlay={active}
      muted
      playsInline
      loop
      className={className}
      wrapperClassName={wrapperClassName}
      transparent={transparent}
      preload="metadata"
      disposeOnExit={false}
      rootMargin="560px 0px"
      warmDelay={180}
      hideUntilReadyOnSafari
      onEnded={onEnded}
      {...props}
    />
  );
}
