"use client";

let cachedSafariResult;
let audioUnlocked = false;
let mediaWarmupRunning = false;
const mediaWarmupQueue = [];
const registeredAudioElements = new Set();
const registeredAudioContexts = new Set();

export function isSafariLike() {
  if (typeof navigator === "undefined") return false;
  if (typeof cachedSafariResult === "boolean") return cachedSafariResult;

  const ua = navigator.userAgent;
  const vendor = navigator.vendor || "";
  const isIOSDevice = isIOSBrowser();
  const isAppleDevice = isIOSDevice || /Macintosh/.test(ua);
  const isWebKit = /WebKit/.test(ua);
  const isChromium = /CriOS|Chrome|Chromium|Edg|OPR|Android/.test(ua);

  cachedSafariResult = isIOSDevice ? isWebKit : isAppleDevice && isWebKit && !isChromium && /Apple/.test(vendor);
  return cachedSafariResult;
}

export function isIOSBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function runWhenIdle(callback, timeout = 1800) {
  if (typeof window === "undefined") return undefined;

  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(callback, Math.min(timeout, 700));
  return () => window.clearTimeout(id);
}

function processMediaWarmupQueue() {
  if (mediaWarmupRunning || typeof window === "undefined") return;

  const nextTask = mediaWarmupQueue.shift();
  if (!nextTask) return;

  if (nextTask.cancelled) {
    processMediaWarmupQueue();
    return;
  }

  mediaWarmupRunning = true;
  runWhenIdle(async () => {
    if (!nextTask.cancelled) {
      await Promise.resolve(nextTask.callback());
    }

    window.setTimeout(() => {
      mediaWarmupRunning = false;
      processMediaWarmupQueue();
    }, nextTask.gap);
  }, nextTask.timeout);
}

export function queueIdleMediaWarmup(callback, { timeout = 1800, gap = 240 } = {}) {
  if (typeof window === "undefined") return () => {};

  const task = {
    callback,
    timeout,
    gap,
    cancelled: false,
  };

  mediaWarmupQueue.push(task);
  processMediaWarmupQueue();

  return () => {
    task.cancelled = true;
  };
}

export function registerUnlockableAudio(audio) {
  if (!audio) return () => {};
  registeredAudioElements.add(audio);

  return () => {
    registeredAudioElements.delete(audio);
  };
}

export function registerUnlockableAudioContext(context) {
  if (!context) return () => {};
  registeredAudioContexts.add(context);

  return () => {
    registeredAudioContexts.delete(context);
  };
}

export async function unlockIOSMedia() {
  if (audioUnlocked || typeof window === "undefined") return;

  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (AudioContextConstructor && !window.__coverupIOSAudioContext) {
    window.__coverupIOSAudioContext = new AudioContextConstructor();
  }

  if (window.__coverupIOSAudioContext) {
    registeredAudioContexts.add(window.__coverupIOSAudioContext);
  }

  await Promise.allSettled(
    [...registeredAudioContexts].map((context) => {
      if (context?.state === "suspended") return context.resume();
      return Promise.resolve();
    })
  );

  await Promise.allSettled(
    [...registeredAudioElements].map(async (audio) => {
      const wasMuted = audio.muted;
      const previousVolume = audio.volume;

      audio.muted = true;
      audio.volume = 0;
      try {
        await audio.play();
      } catch {
        // Some iOS versions still reject locked media; the real user gesture is enough for future playback.
      } finally {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = wasMuted;
        audio.volume = previousVolume;
      }
    })
  );

  audioUnlocked = true;
  window.dispatchEvent(new CustomEvent("ios-media-unlocked"));
}
