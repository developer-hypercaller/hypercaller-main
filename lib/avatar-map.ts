// Avatar mapping: ID to emoji
export const avatarMap: Record<string, string> = {
  avatar1: "👤",
  avatar2: "👨‍💼",
  avatar3: "👩‍💼",
};

// Get avatar emoji by ID
export function getAvatarEmoji(avatarId: string | null | undefined): string {
  if (!avatarId) return "👤";
  return avatarMap[avatarId] || avatarId; // Return the ID itself if not found (fallback)
}

