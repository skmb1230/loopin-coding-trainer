export function analyzeFailure(runResult) {
  if (runResult.status === 'timeout') return { title: '현재 방식은 입력이 커질 때 오래 걸릴 수 있어요.', suggestions: ['같은 값을 반복해서 계산하고 있지 않은지 확인해보세요.', '중첩 반복문을 한 번의 순회로 줄일 수 있을까요?'] };
  if (runResult.status === 'error') return { title: '코드를 실행하는 중 확인할 부분이 있어요.', suggestions: [runResult.error, '괄호, 변수 이름, return 위치를 차례로 확인해보세요.'] };
  const failed = runResult.results.filter((result) => !result.passed);
  return {
    title: `아직 통과하지 못한 테스트가 ${failed.length}개 있어요.`,
    suggestions: [...new Set(failed.map((result) => result.guidance || `${result.label || '경계 조건'}을 다시 확인해보세요.`))].slice(0, 3),
  };
}
