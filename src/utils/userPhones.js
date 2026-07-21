import { supabase } from "@/utils/supabase";

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export async function loadUserPhones() {
  const response = await fetch("/api/user-phones", {
    headers: await authHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to load phones.");
  return data.phones || [];
}

export async function createUserPhone(phone) {
  const response = await fetch("/api/user-phones", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    },
    body: JSON.stringify(phone),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to save phone.");
  return data.phone;
}

export async function updateUserPhone(phone) {
  const response = await fetch("/api/user-phones", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    },
    body: JSON.stringify(phone),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to update phone.");
  return data.phone;
}

export async function deleteUserPhone(id) {
  const response = await fetch(`/api/user-phones?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to delete phone.");
  return data.id;
}
