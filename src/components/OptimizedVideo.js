"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { queueIdleMediaWarmup } from "@/utils/ios-media";

function disposeVideo(video) {
  if (!video) return;
  video.pause();
  video.removeAttribute("src");
  delete video.dataset.optimizedSrc;
  video.load();
}

const OptimizedVideo = forwardRef(function OptimizedVideo(
  {
    src,
    active = true,
    className = "",
    wrapperClassName = "",
    transparent = false,
    preload = "metadata",
    disposeOnExit = false,
    forceLoad = false,
    warmOnIdle = true,
    warmDelay = 0,
    hideUntilReadyOnSafari = false,
    rootMargin = "420px 0px",
    autoPlay = false,
    muted = true,
    playsInline = true,
    onCanPlay,
    onEnded,
    onError,
    onLoadedData,
    onPlaying,
    ...props
  },
  forwardedRef
) {
  const videoRef = useRef(null);
  const wrapperRef = useRef(null);
  const warmedRef = useRef(false);
  const [nearViewport, setNearViewport] = useState(false);
  const [ready, setReady] = useState(false);
  const hideUntilReady = hideUntilReadyOnSafari && !ready;

  useImperativeHandle(forwardedRef, () => videoRef.current);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return undefined;

    if (forceLoad) {
      setNearViewport(true);
      return undefined;
    }

    if (!("IntersectionObserver" in window)) {
      setNearViewport(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isNear = entry.isIntersecting;
        setNearViewport(isNear);

        if (!isNear) {
          if (disposeOnExit) {
            disposeVideo(videoRef.current);
            warmedRef.current = false;
          } else {
            videoRef.current?.pause();
          }
        }
      },
      { rootMargin, threshold: 0.01 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [disposeOnExit, forceLoad, rootMargin]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !nearViewport) return undefined;

    video.preload = preload;
    if (video.dataset.optimizedSrc !== src) {
      setReady(false);
      video.src = src;
      video.dataset.optimizedSrc = src;
      video.load();
    }

    if (!warmOnIdle || warmedRef.current) return undefined;

    let cancelWarmup = () => {};
    const cancelDelay = window.setTimeout(() => {
      cancelWarmup = queueIdleMediaWarmup(() => {
        if (!videoRef.current || !nearViewport || warmedRef.current) return;
        videoRef.current.preload = preload;
        videoRef.current.load();
        warmedRef.current = true;
      });
    }, warmDelay);

    return () => {
      window.clearTimeout(cancelDelay);
      cancelWarmup();
    };
  }, [nearViewport, preload, src, warmDelay, warmOnIdle]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !nearViewport) return;

    if (!active) {
      video.pause();
      return;
    }

    if (video.dataset.optimizedSrc !== src) {
      setReady(false);
      video.src = src;
      video.dataset.optimizedSrc = src;
      video.load();
    }

    if (autoPlay) {
      video.play().catch(() => {});
    }
  }, [active, autoPlay, nearViewport, src]);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (disposeOnExit) disposeVideo(video);
    };
  }, [disposeOnExit]);

  const markReady = (event) => {
    setReady(true);
    onLoadedData?.(event);
  };

  const markCanPlay = (event) => {
    setReady(true);
    if (active && autoPlay) event.currentTarget.play().catch(() => {});
    onCanPlay?.(event);
  };

  const markPlaying = (event) => {
    setReady(true);
    onPlaying?.(event);
  };

  const markErrored = (event) => {
    setReady(false);
    onError?.(event);
  };

  return (
    <span
      ref={wrapperRef}
      className={[
        "optimized-video-shell",
        wrapperClassName,
        hideUntilReady ? "is-video-loading" : "is-video-ready",
      ].filter(Boolean).join(" ")}
      data-transparent-video={transparent ? "true" : undefined}
      data-video-ready={ready ? "true" : "false"}
    >
      <video
        {...props}
        ref={videoRef}
        className={className}
        muted={muted}
        playsInline={playsInline}
        webkit-playsinline="true"
        preload={nearViewport ? preload : "none"}
        onCanPlay={markCanPlay}
        onEnded={onEnded}
        onError={markErrored}
        onLoadedData={markReady}
        onPlaying={markPlaying}
        onPause={(event) => {
          if (active && autoPlay && nearViewport && !event.currentTarget.ended) {
            event.currentTarget.play().catch(() => {});
          }
          props.onPause?.(event);
        }}
      />
    </span>
  );
});

export default OptimizedVideo;
