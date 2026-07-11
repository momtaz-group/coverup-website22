import sys

with open("src/app/products/page.js", "r", encoding="utf-8") as f:
    content = f.read()

old_button = """                    <button
                      type="button"
                      className={`amazon-wishlist-btn ${isFavorite ? "is-active" : ""}`}
                      onClick={() => toggleWishlist(p.id)}
                      aria-label="Wishlist"
                    >
                      ★
                    </button>"""

heart_svg = """                    <button
                      type="button"
                      className={`amazon-wishlist-btn ${isFavorite ? "is-active" : ""}`}
                      onClick={() => toggleWishlist(p.id)}
                      aria-label="Wishlist"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavorite ? "#ff4d4d" : "none"} stroke={isFavorite ? "#ff4d4d" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                    </button>"""

if old_button in content:
    content = content.replace(old_button, heart_svg)
    with open("src/app/products/page.js", "w", encoding="utf-8") as f:
        f.write(content)
    print("Heart successfully replaced in store cards!")
else:
    print("Could not find old wishlist button to replace.")
    sys.exit(1)
