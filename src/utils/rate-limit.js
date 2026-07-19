// Simple in-memory rate limiter
const store = new Map();

export function rateLimit(key, { maxRequests = 60, windowMs = 60000 } = {}) {
  const now = Date.now();
  
  if (!store.has(key)) {
    store.set(key, []);
  }
  
  const timestamps = store.get(key).filter(time => now - time < windowMs);
  
  if (timestamps.length >= maxRequests) {
    return false;
  }
  
  timestamps.push(now);
  store.set(key, timestamps);
  
  return true;
}

export function getRateLimitHeaders(key, { maxRequests = 60, windowMs = 60000 } = {}) {
  const now = Date.now();
  const timestamps = store.get(key)?.filter(time => now - time < windowMs) || [];
  
  return {
    "X-RateLimit-Limit": String(maxRequests),
    "X-RateLimit-Remaining": String(Math.max(0, maxRequests - timestamps.length)),
    "X-RateLimit-Reset": String(Math.ceil((now + windowMs) / 1000)),
  };
}
