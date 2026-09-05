const record = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const choice = (value, choices, fallback) => choices.includes(value) ? value : fallback;

export function normalizeSettings(value, profileValue) {
  const saved = record(value);
  const profile = record(profileValue);
  return {
    theme: choice(saved.theme, ['light', 'dark'], 'light'),
    editorFontSize: choice(saved.editorFontSize, [13, 14, 15, 16, 18], 14),
    focusMinutes: choice(saved.focusMinutes, [25, 40, 50, 60, 90], choice(profile.focusMinutes, [25, 40, 50, 60, 90], 50)),
    learningLanguage: choice(saved.learningLanguage, ['javascript', 'java'], choice(profile.learningLanguage, ['javascript', 'java'], 'javascript')),
  };
}
