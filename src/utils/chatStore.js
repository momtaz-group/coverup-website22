/**
 * Module-level singleton chat store.
 * Unlike sessionStorage (which requires async useEffect to sync),
 * this is updated SYNCHRONOUSLY and persists across client-side
 * navigations within the same JS session.
 * On hard refresh / SSR, sessionStorage is used as a fallback.
 */

let _messages = null;   // null = not yet initialised
let _chatPhone = null;

export function getStoredMessages() {
  return _messages;
}

export function storeMessages(msgs) {
  _messages = msgs ? msgs.map((m) => ({ ...m, isNew: false })) : null;
  // Also persist to sessionStorage as a fallback for hard-refresh
  if (typeof window !== "undefined" && _messages) {
    try {
      sessionStorage.setItem("coverup-chat-messages", JSON.stringify(_messages));
    } catch {}
  }
}

export function getStoredChatPhone() {
  return _chatPhone;
}

export function storeChatPhone(phone) {
  _chatPhone = phone;
  if (typeof window !== "undefined" && phone) {
    try {
      sessionStorage.setItem("coverup-chat-phone", JSON.stringify(phone));
    } catch {}
  }
}

/** Load initial messages: module store → sessionStorage → null */
export function loadInitialMessages() {
  if (_messages !== null) return _messages;
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem("coverup-chat-messages");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          _messages = parsed.map((m) => ({ ...m, isNew: false }));
          return _messages;
        }
      }
    } catch {}
  }
  return null;
}

/** Load initial chatPhone: module store → sessionStorage → null */
export function loadInitialChatPhone() {
  if (_chatPhone !== null) return _chatPhone;
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem("coverup-chat-phone");
      if (raw) {
        _chatPhone = JSON.parse(raw);
        return _chatPhone;
      }
    } catch {}
  }
  return null;
}
