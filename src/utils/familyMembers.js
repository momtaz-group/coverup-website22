import { supabase } from "@/utils/supabase";

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export async function loadFamilyMembers() {
  const response = await fetch("/api/family-members", {
    headers: await authHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to load family members.");
  return data.members || [];
}

export async function createFamilyMember(member) {
  const response = await fetch("/api/family-members", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    },
    body: JSON.stringify(member),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to save family member.");
  return data.member;
}

export async function updateFamilyMember(member) {
  const response = await fetch("/api/family-members", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    },
    body: JSON.stringify(member),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to update family member.");
  return data.member;
}

export async function deleteFamilyMember(id) {
  const response = await fetch(`/api/family-members?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to delete family member.");
  return data.id;
}
