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
    available: true,
    runtimeRequirement: 'JDK 21+',
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

export function getProgressStorageKey(problemId, languageId = 'javascript') {
  return `${problemId}:${languageId}`;
}

export function getProblemLanguageVariant(problem, languageId = 'javascript') {
  return problem.languageVariants?.[languageId] || problem.languageVariants?.javascript || {
    starterCode: problem.starterCode,
    referenceSolution: problem.referenceSolution,
    prerequisites: problem.prerequisites,
    pseudocode: problem.solutionExplanation?.pseudocode,
  };
}

export function getDisplayProblemId(problemId, languageId = 'javascript') {
  return languageId === 'java' ? problemId.replace(/^JS/, 'JAVA') : problemId;
}
