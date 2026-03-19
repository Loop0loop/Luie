function deriveEditorFontFamilyCss(input) {
  const { fontFamily, fontPreset, customFontFamily } = input;

  if (customFontFamily?.trim()) {
    return customFontFamily.trim();
  }

  if (fontPreset === "inter") {
    return '"Inter Variable", "Inter", var(--font-sans)';
  }

  if (fontFamily === "system-ui") {
    return "var(--font-sans)";
  }

  if (fontFamily === "serif") {
    return "var(--font-serif)";
  }

  if (fontFamily === "mono") {
    return "var(--font-mono)";
  }

  const trimmedFamily = fontFamily.trim();
  return trimmedFamily
    ? `"${trimmedFamily}", var(--font-sans)`
    : "var(--font-sans)";
}

// Test cases from our unit tests
console.log('Test 1 - Custom font:', deriveEditorFontFamilyCss({fontFamily: 'system-ui', customFontFamily: 'Pretendard'}));
console.log('Test 2 - Serif preset:', deriveEditorFontFamilyCss({fontFamily: 'serif'}));
console.log('Test 3 - System font:', deriveEditorFontFamilyCss({fontFamily: 'Noto Sans KR'}));
console.log('Test 4 - Inter preset:', deriveEditorFontFamilyCss({fontFamily: 'system-ui', fontPreset: 'inter'}));
console.log('Test 5 - Default fallback:', deriveEditorFontFamilyCss({fontFamily: ''}));
console.log('Test 6 - Mono:', deriveEditorFontFamilyCss({fontFamily: 'mono'}));
