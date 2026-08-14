const TEAM_NAME_MIN = 2;
const TEAM_NAME_MAX = 30;
const TEAM_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9\s\-_.]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function validateEmail(email) {
  const normalized = normalizeEmail(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    return { ok: false, error: 'Please enter a valid email address' };
  }
  return { ok: true, value: normalized };
}

export function validatePassword(password) {
  if (!password || password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters' };
  }
  return { ok: true, value: password };
}

export function validateTeamName(teamName) {
  const trimmed = teamName.trim();
  if (trimmed.length < TEAM_NAME_MIN || trimmed.length > TEAM_NAME_MAX) {
    return {
      ok: false,
      error: `Team name must be ${TEAM_NAME_MIN}–${TEAM_NAME_MAX} characters`,
    };
  }
  if (!TEAM_NAME_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: 'Team name must start and end with a letter or number',
    };
  }
  return { ok: true, value: trimmed };
}
