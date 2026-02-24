const DRAFTS_KEY = "bastyon-chat:drafts";

function loadAll(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAll(drafts: Record<string, string>) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function getDraft(roomId: string): string {
  return loadAll()[roomId] ?? "";
}

export function saveDraft(roomId: string, text: string) {
  const drafts = loadAll();
  if (text.trim()) {
    drafts[roomId] = text;
  } else {
    delete drafts[roomId];
  }
  saveAll(drafts);
}

export function clearDraft(roomId: string) {
  const drafts = loadAll();
  delete drafts[roomId];
  saveAll(drafts);
}
