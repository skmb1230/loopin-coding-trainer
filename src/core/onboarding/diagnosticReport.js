import { getDiagnosticQuestions } from '../../data/onboardingDiagnostics.js';

const TOTAL = 8;
const languageLabels = { javascript: 'JavaScript', java: 'Java' };
const record = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const scoreValue = (value) => Number.isInteger(value) && value >= 0 && value <= TOTAL ? value : null;

/** Read the original diagnostic without guessing missing answers or mutating it. */
export function getDiagnosticReport(profile) {
  const saved = record(profile);
  const missingLanguage = saved.learningLanguage == null || (typeof saved.learningLanguage === 'string' && !saved.learningLanguage.trim());
  const languageId = missingLanguage ? 'javascript' : typeof saved.learningLanguage === 'string' ? saved.learningLanguage : null;
  const languageSupported = Object.hasOwn(languageLabels, languageId);
  const languageLabel = languageSupported ? languageLabels[languageId] : '지원하지 않는 언어';
  const missingVersion = !Object.hasOwn(saved, 'diagnosticVersion') || saved.diagnosticVersion === undefined;
  const version = missingVersion ? 1 : Number.isInteger(saved.diagnosticVersion) && saved.diagnosticVersion > 0 ? saved.diagnosticVersion : null;
  const questions = getDiagnosticQuestions(languageId, version);
  const answers = Array.isArray(saved.diagnosticAnswers) ? saved.diagnosticAnswers : [];
  const storedScore = scoreValue(saved.diagnosticScore);
  const rows = questions.map((question, index) => {
    const answer = answers[index];
    const selectedIndex = Number.isInteger(answer) && answer >= 0 && answer < question.options.length ? answer : null;
    return {
      number: index + 1,
      area: question.area,
      question: question.question,
      options: [...question.options],
      selectedIndex,
      selectedAnswer: selectedIndex === null ? null : question.options[selectedIndex],
      correctAnswer: question.options[question.answer],
      isCorrect: selectedIndex === null ? null : selectedIndex === question.answer,
      explanation: question.explanation,
    };
  });
  const answeredCount = rows.filter((row) => row.selectedIndex !== null).length;
  const hasAnswers = answeredCount > 0;
  const taken = typeof saved.diagnosticTaken === 'boolean' ? saved.diagnosticTaken : ((storedScore !== null && storedScore > 0) || hasAnswers) ? true : null;
  const hasDiagnosticEvidence = saved.diagnosticTaken === true || storedScore !== null || hasAnswers;
  const notices = [];
  if (missingLanguage) notices.push('언어 기록이 없어 당시 기본값인 JavaScript 진단 기준으로 표시합니다.');

  if (taken === false) {
    notices.push('진단 없이 시작한 기록입니다. 미응시는 0점과 다르며 문항별 답변을 표시하지 않습니다.');
    return { languageId, languageLabel, version, taken, score: null, scoreSource: null, scoreMismatch: false, answeredCount: 0, total: TOTAL, rows: [], notice: notices.join(' ') };
  }

  if (!languageSupported) notices.push('저장된 학습 언어를 지원하지 않아 문항별 결과를 대조하지 않았습니다.');
  if (version !== 1) notices.push('저장된 진단 문항 버전을 지원하지 않아 문항별 결과를 대조하지 않았습니다.');
  if (!hasDiagnosticEvidence) notices.push('저장된 진단 결과가 없습니다.');
  else if (questions.length) {
    if (missingVersion) notices.push('문항 버전 기록이 없어 기존 버전 1 문항을 사용합니다.');
    if (!hasAnswers) notices.push('선택한 답변이 남아 있지 않아 문항별 정오답을 확인할 수 없습니다. 미기록은 오답으로 처리하지 않습니다.');
    else if (answeredCount < TOTAL || answers.length !== TOTAL) notices.push('일부 답변이 없거나 형식이 맞지 않아 전체 점수를 재계산하지 않았습니다. 미기록은 오답으로 처리하지 않습니다.');
  }
  const calculatedScore = answeredCount === TOTAL && answers.length === TOTAL ? rows.filter((row) => row.isCorrect).length : null;
  const score = storedScore ?? calculatedScore;
  const scoreSource = storedScore !== null ? 'saved' : calculatedScore !== null ? 'answers' : null;
  const scoreMismatch = storedScore !== null && calculatedScore !== null && storedScore !== calculatedScore;
  if (scoreMismatch) notices.push('저장된 점수와 남아 있는 답변의 계산 결과가 다릅니다. 당시 저장된 점수를 유지하며 문항별 결과는 남은 답변 기준으로 표시합니다.');
  else if (scoreSource === 'answers') notices.push('저장 점수가 없어 남아 있는 8개 답변으로 점수를 계산했습니다.');
  if (taken === null && storedScore === 0) notices.push('0점은 저장되어 있지만 응시 여부와 답변이 없어 실제 응시 결과인지 확인할 수 없습니다.');
  return { languageId, languageLabel, version, taken, score, scoreSource, scoreMismatch, answeredCount, total: TOTAL, rows: hasDiagnosticEvidence ? rows : [], notice: notices.join(' ') };
}
