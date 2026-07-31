# daily-workout-routine

AI 피드백용 운동 기록을 작성하고 날짜별로 보관하는 PWA입니다.

## 기록 보관 방식

- 입력할 때마다 전체 날짜별 기록을 `localStorage`에 저장합니다.
- 매일 현지 시각 새벽 4시에 새로운 운동일로 전환합니다.
- 이전 기록은 삭제하지 않고 운동 잔디와 상세 기록에 유지합니다.
- 로그인한 사용자의 로컬 기록은 Supabase에 자동으로 업로드됩니다.
- 오프라인에서는 로컬에 계속 저장하고 연결이 복구되면 다시 동기화합니다.

## Supabase 설정

1. `.env.example`을 참고해 `.env.local`을 만듭니다.

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

브라우저에는 publishable key만 사용합니다. secret 또는 service role key를
`VITE_` 환경변수에 넣으면 안 됩니다.

2. Supabase CLI 프로젝트를 연결하고 마이그레이션을 적용합니다.

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push --dry-run
supabase db push
```

3. 앱은 iOS 홈 화면 PWA에서도 로그인 세션을 안정적으로 유지하도록 이메일과
비밀번호 로그인을 사용합니다. 최초 가입 시 받은 확인 메일을 연 뒤 홈 화면
앱으로 돌아와 로그인합니다.

## 개발

```bash
pnpm install
pnpm dev
```

검증 명령:

```bash
pnpm build
pnpm lint
```
