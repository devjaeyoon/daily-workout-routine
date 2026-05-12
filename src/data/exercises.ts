export type ExerciseDef = {
  name: string;
  category: string;
};

/** 기획서 3.2 기본 운동 목록 + 부위 필터용 카테고리 */
export const EXERCISE_CATALOG: ExerciseDef[] = [
  { name: '벤치 프레스', category: '가슴' },
  { name: '케이블 푸쉬 다운', category: '팔' },
  { name: '인클라인 덤벨 프레스', category: '가슴' },
  { name: '체스트 플라이', category: '가슴' },
  { name: '사이드 레터럴 레이즈', category: '어깨' },
  { name: '바벨 컬', category: '팔' },
  { name: '바벨 숄더 프레스(스미스 머신)', category: '어깨' },
  { name: '바벨 로우', category: '등' },
  { name: '랫 풀 다운', category: '등' },
  { name: '시티드 케이블 로우', category: '등' },
  { name: '페이스 풀', category: '등' },
  { name: '스쿼트', category: '하체' },
  { name: '카프레이즈', category: '하체' },
  { name: '루마니안 데드 리프트', category: '하체' },
  { name: '레그 프레스', category: '하체' },
  { name: '레그 익스텐션', category: '하체' },
];

export const EXERCISE_CATEGORIES = [
  '전체',
  ...Array.from(new Set(EXERCISE_CATALOG.map((e) => e.category))).sort(),
] as const;
