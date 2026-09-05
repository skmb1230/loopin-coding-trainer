// Text labels stay visible at every viewport size; icons are decorative only.
export const navItems = [
  ['today', '◫', '오늘 학습'], ['problems', '⌁', '문제 풀기'],
  ['roadmap', '⌘', '학습 로드맵'], ['review', '↻', '오답 복습'],
  ['theory', '◈', '개념·이론'], ['ai', '✦', '인공지능 학습'],
  ['systems', '◎', '네트워크·보안'], ['career', '◇', '깃·클라우드 면접'],
  ['words', 'Aa', '회의 용어 연습'], ['notes', '≡', '내 메모'],
  ['analytics', '⌗', '학습 통계'], ['profile', '◉', '내 정보'],
  ['settings', '⚙', '설정'],
];

export const navSections = [
  { label: '코딩테스트', ids: ['today', 'problems', 'roadmap', 'review'] },
  { label: '개념과 실무', ids: ['theory', 'ai', 'systems', 'career'] },
  { label: '선택 학습', ids: ['words'] },
  { label: '내 기록과 설정', ids: ['notes', 'analytics', 'profile', 'settings'] },
];
