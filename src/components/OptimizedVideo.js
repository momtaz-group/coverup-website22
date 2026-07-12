"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { isSafariLike, queueIdleMediaWarmup } from "@/utils/ios-media";

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
  const canvasRef = useRef(null);
  const canvasReadyRef = useRef(false);
  const wrapperRef = useRef(null);
  const warmedRef = useRef(false);
  const [nearViewport, setNearViewport] = useState(false);
  const [ready, setReady] = useState(false);
  const [safariAlphaFallback, setSafariAlphaFallback] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const hideUntilReady = hideUntilReadyOnSafari && safariAlphaFallback && !ready;

  useImperativeHandle(forwardedRef, () => videoRef.current);

  useEffect(() => {
    setSafariAlphaFallback(transparent && isSafariLike());
    canvasReadyRef.current = false;
    setCanvasReady(false);
  }, [transparent]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!safariAlphaFallback || !nearViewport || !video || !canvas) return undefined;

    let cancelled = false;
    let animationFrame = 0;
    let videoFrame = 0;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return undefined;

    const draw = () => {
      if (cancelled || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
      const bounds = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(bounds.width * scale));
      const height = Math.max(1, Math.round(bounds.height * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const sourceRatio = video.videoWidth / video.videoHeight;
      const targetRatio = width / height;
      const drawWidth = sourceRatio > targetRatio ? width : height * sourceRatio;
      const drawHeight = sourceRatio > targetRatio ? width / sourceRatio : height;
      const x = (width - drawWidth) / 2;
      const y = (height - drawHeight) / 2;
      context.clearRect(0, 0, width, height);

      try {
        context.drawImage(video, x, y, drawWidth, drawHeight);
        const frame = context.getImageData(0, 0, width, height);
        const pixels = frame.data;
        for (let index = 0; index < pixels.length; index += 4) {
          const brightness = Math.max(pixels[index], pixels[index + 1], pixels[index + 2]);
          if (brightness <= 12) pixels[index + 3] = 0;
          else if (brightness <= 42) pixels[index + 3] = Math.min(pixels[index + 3], Math.round(((brightness - 12) / 30) * 255));
        }
        context.putImageData(frame, 0, 0);
        if (!canvasReadyRef.current) {
          canvasReadyRef.current = true;
          setCanvasReady(true);
        }
      } catch {
        cancelled = true;
        canvasReadyRef.current = false;
        setCanvasReady(false);
      }
    };

    const next = () => {
      if (cancelled) return;
      draw();
      if ("requestVideoFrameCallback" in video) videoFrame = video.requestVideoFrameCallback(next);
      else animationFrame = window.requestAnimationFrame(next);
    };

    next();
    return () => {
      cancelled = true;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (videoFrame && "cancelVideoFrameCallback" in video) video.cancelVideoFrameCallback(videoFrame);
    };
  }, [nearViewport, safariAlphaFallback, src]);

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
        safariAlphaFallback ? "safari-alpha-video-bg is-safari-alpha-video" : "",
        hideUntilReady ? "is-video-loading" : "is-video-ready",
      ].filter(Boolean).join(" ")}
      data-safari-alpha-fallback={safariAlphaFallback ? "true" : undefined}
      data-video-ready={ready ? "true" : "false"}
    >
      <video
        {...props}
        ref={videoRef}
        className={`${className} ${safariAlphaFallback && canvasReady ? "transparent-source-hidden" : ""}`}
        crossOrigin={safariAlphaFallback ? "anonymous" : props.crossOrigin}
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
      {safariAlphaFallback && (
        <canvas
          ref={canvasRef}
          className={`transparent-video-canvas ${canvasReady ? "is-ready" : ""}`}
          aria-hidden="true"
        />
      )}
    </span>
  );
});

export default OptimizedVideo;
