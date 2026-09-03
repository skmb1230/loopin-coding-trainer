export const languageRegistry = {
  javascript: {
    id: 'javascript',
    label: 'JavaScript',
    extension: 'js',
    editorLanguage: 'javascript',
    runtime: 'web-worker',
    available: true,
  },
  python: {
    id: 'python',
    label: 'Python',
    extension: 'py',
    editorLanguage: 'python',
    runtime: 'pyodide-worker',
    available: false,
  },
  java: {
    id: 'java',
    label: 'Java',
    extension: 'java',
    editorLanguage: 'java',
    runtime: 'java-runner',
    available: false,
  },
};

export function getLanguage(languageId = 'javascript') {
  return languageRegistry[languageId] || languageRegistry.javascript;
}

export function getAvailableLanguages() {
  return Object.values(languageRegistry).filter((language) => language.available);
}

export function getCodeStorageKey(problemId, languageId = 'javascript') {
  return `${problemId}:${languageId}`;
}
