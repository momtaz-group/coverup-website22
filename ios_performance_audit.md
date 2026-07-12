# iOS Safari Performance Audit

Date: 2026-07-12

## Scope Found In This Workspace

This repository currently contains the Cover Up Next.js app, not a full Nofoora reader/MBTI project. A full source search found only two live `<video>` elements, both on the home page:

- `src/app/page.js`: Memo idle transparent WebM
- `src/app/page.js`: Memo searching transparent WebM

No Reader Theme video/audio files, Nofoora reader routes, MBTI character routes, or existing audio playback system were present in this workspace. Reusable components were added for those surfaces so the same iOS rules can be applied when those modules exist.

## Optimizations Applied

### Video performance

- Added `src/components/OptimizedVideo.js`.
- Replaced the two home page Memo `<video>` tags with `OptimizedVideo`.
- Videos now use `preload="metadata"` only once they are close to the viewport.
- Videos use `preload="none"` while not near the viewport.
- Videos lazy-load through `IntersectionObserver`.
- Memo videos are warmed after idle time using `requestIdleCallback` where supported.
- Warm-up is staggered so both WebMs do not decode at the same time.
- Warm-up is now globally queued so iPhone Safari does not decode multiple video elements simultaneously.
- Inactive videos are paused.
- Videos with `disposeOnExit` release their `src` when outside the viewport to reduce iOS memory pressure.
- Removed a synchronous `setState` effect for Memo video state and replaced it with a derived value, reducing one avoidable render pass.

### Transparent WebM Safari workaround

- Added Safari/iOS detection in `src/utils/ios-media.js`.
- Transparent WebM containers now receive a Safari-only alpha fallback class.
- Safari transparent videos are hidden until `loadeddata`, `canplay`, or `playing` fires, preventing black first-frame flashes while WebKit initializes the asset.
- Added theme-matched fallback backgrounds:
  - Light theme: white
  - Dark theme: black
- Chrome, Edge, and Android are not given the fallback class.
- WebM was kept. No MOV replacement was introduced.

### First-play lag reduction

- Added idle warm-up via `runWhenIdle`.
- Warm-up only runs after the video is eligible to load.
- Video warm-up tasks are serialized with a small gap between tasks to avoid iPhone decode spikes.
- The current Memo state warms immediately when near the viewport.
- The alternate Memo state warms later to avoid simultaneous decode work.

### Reader Theme readiness

- Added `src/components/ReaderThemeMedia.js`.
- `ReaderThemeVideos` renders only the selected theme video.
- It preloads only one next likely theme with metadata.
- The selected reader theme can force-load immediately on iPhone for faster startup while still avoiding full-set preloading.
- The next likely reader theme warms shortly after the current theme through the global warm-up queue.
- Unused theme videos are unmounted/disposed by React instead of staying loaded.
- `ReaderThemeAudio` registers audio elements with the iOS unlock system and keeps `preload="none"`.

### iOS audio unlock

- Added `src/components/IOSMediaUnlocker.js`.
- Added global first-interaction listeners in the root layout.
- On the first touch/pointer/key interaction, the app resumes a shared `AudioContext`.
- Registered Reader Theme audio elements are unlocked after that gesture.
- No mute/unmute button or volume-button workaround is required.

### MBTI video readiness

- Added `src/components/MBTICharacterVideo.js`.
- MBTI videos lazy-load through `OptimizedVideo`.
- They pause outside the viewport.
- They keep their source/buffer when outside the viewport so resume is faster.
- Warm-up is delayed slightly and queued to avoid repeated simultaneous decode work.
- Safari/iPhone MBTI character videos inherit the theme background and stay hidden until a playable frame is available, avoiding black loading screens.

### Page and asset performance

- Created `public/assets/memo-profile-96.webp`.
- Replaced tiny Memo avatar usages with the new 96 px WebP.
- The avatar asset dropped from about 1.29 MB to about 1.1 KB for those UI locations.
- Added `loading="lazy"` and `decoding="async"` to safe below-the-fold product/cart/account images.
- Added `decoding="async"` to the main product image.

## Estimated Improvements

- Initial video network pressure: reduced from eager autoplay source fetches to metadata/lazy loading. Expected improvement on iPhone Safari: noticeable reduction in first paint contention and less startup stutter on slower connections.
- First-play latency: improved by idle warm-up and staggered metadata load. Expected improvement: smoother first Memo animation start after initial idle time.
- iPhone scroll smoothness: improved by serializing video warm-up instead of letting several videos decode in the same idle window.
- Memory pressure: reduced by disposing offscreen disposable videos and pausing retained videos. Expected reduction for active video pages: one or more decoded video buffers avoided when offscreen.
- Image transfer: Memo avatar usage reduced by roughly 1.29 MB per avatar source request to about 1.1 KB.
- Bundle size: effectively unchanged for initial pages. New Reader/MBTI components are not imported by current routes, so they do not add to the active route bundles.

## Safari-Specific Workarounds

- Safari/iOS detection avoids affecting Chromium browsers.
- Transparent WebM fallback background prevents black alpha artifacts from looking random.
- First user interaction unlocks `AudioContext` and registered audio elements.
- `playsInline` is preserved for video playback on iPhone.
- No full video preload is used.

## Remaining Safari Limitations

- Safari may still reject some programmatic audio playback until a real user gesture occurs. The app now captures the first gesture globally, which is the supported workaround.
- Safari transparent WebM alpha behavior is inconsistent across iOS versions. The theme background fallback hides the artifact but cannot restore a lost alpha channel.
- `requestIdleCallback` is not available on every Safari version. A timeout fallback is used.
- Remote WebM performance also depends on server cache headers and video encoding. This pass did not re-encode remote R2 assets.
- The requested Nofoora Reader Theme and MBTI surfaces were not present in this workspace, so their live screens could not be browser-tested here.

## Verification

- `npm run build`: passed.
- Focused ESLint on new media layer and home page: passed with existing Next `<img>` warnings only.
- Broad lint still reports pre-existing hook rule issues in `account`, `cart`, `product`, and `products` pages that were outside the media changes.
