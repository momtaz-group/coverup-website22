export function getSectionType(categoryInput, categoriesList = []) {
  if (!categoryInput) return "standard";
  const str = String(categoryInput).trim().toLowerCase();

  // Find matching category in categoriesList by ID or Name
  const match = (categoriesList || []).find((c) => {
    if (!c) return false;
    const cid = String(c.id || "").toLowerCase();
    const cname = String(c.name || "").toLowerCase();
    return cid === str || cname === str;
  });

  const checkName = match ? String(match.name || "").toLowerCase() : str;
  const checkId = match ? String(match.id || "").toLowerCase() : str;

  const isScreenProtector =
    checkName.includes("سكرين") ||
    checkName.includes("screen") ||
    checkName.includes("protector") ||
    checkName.includes("حماية الشاشة") ||
    checkName.includes("شاشة") ||
    checkName.includes("glass") ||
    checkName.includes("tempered") ||
    checkId.includes("screen") ||
    checkId.includes("protector") ||
    checkId.includes("glass");

  if (isScreenProtector) return "screen_protectors";

  const isCover =
    checkName.includes("كفر") ||
    checkName.includes("cover") ||
    checkName.includes("case") ||
    checkName.includes("كفرات") ||
    checkName.includes("جراب") ||
    checkId.includes("case") ||
    checkId.includes("cover");

  if (isCover) return "covers";

  return "standard";
}
