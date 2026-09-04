import type { AuthStatus } from '@/features/auth/useSupabaseAuth';
import type { SyncStatus } from '@/features/workout/hooks/useWorkoutSessions';
import { formatWorkoutDate } from '@/features/workout/lib/workoutDate';

export const APP_TABS = ['today', 'history'] as const;

export type AppTab = (typeof APP_TABS)[number];

export type AppTabIcon = 'today' | 'history';

type AppTabPresentation = {
  headerTitle: string;
  headerDescription: (currentDate: string) => string;
  navigationLabel: string;
  icon: AppTabIcon;
};

export const APP_TAB_PRESENTATION = {
  today: {
    headerTitle: '오늘의 운동',
    headerDescription: (currentDate) =>
      `${formatWorkoutDate(currentDate)} · 새벽 4시 기준`,
    navigationLabel: '오늘',
    icon: 'today',
  },
  history: {
    headerTitle: '운동 기록',
    headerDescription: () => '운동한 날과 세트 기록을 모아봤어요',
    navigationLabel: '기록',
    icon: 'history',
  },
} satisfies Record<AppTab, AppTabPresentation>;

type SyncStatusPresentation = {
  headerLabel: string;
  indicatorClassName: string;
  accountLabel: string;
  accountDescription: string;
};

export const SYNC_STATUS_PRESENTATION = {
  local: {
    headerLabel: '이 기기에 저장됨',
    indicatorClassName: 'bg-[#20C997]',
    accountLabel: '로컬 저장',
    accountDescription: '기록을 이 기기에 안전하게 저장하고 있어요.',
  },
  syncing: {
    headerLabel: '동기화 중',
    indicatorClassName: 'bg-[#FFB020]',
    accountLabel: '동기화 중',
    accountDescription: '변경된 운동 기록을 서버에 저장하고 있어요.',
  },
  synced: {
    headerLabel: '동기화됨',
    indicatorClassName: 'bg-[#20C997]',
    accountLabel: '동기화 완료',
    accountDescription: '이 기기와 Supabase의 기록이 최신 상태예요.',
  },
  offline: {
    headerLabel: '오프라인 저장',
    indicatorClassName: 'bg-[#FFB020]',
    accountLabel: '오프라인 저장',
    accountDescription: '이 기기에 저장했어요. 연결되면 자동 동기화해요.',
  },
  error: {
    headerLabel: '저장 확인 필요',
    indicatorClassName: 'bg-[#F04452]',
    accountLabel: '동기화 확인 필요',
    accountDescription: '서버 저장을 완료하지 못했어요. 다시 시도해 주세요.',
  },
  'account-conflict': {
    headerLabel: '계정 확인 필요',
    indicatorClassName: 'bg-[#F04452]',
    accountLabel: '다른 계정의 기록 보호 중',
    accountDescription:
      '이 기기의 기존 기록을 보호하려면 사용할 계정을 확인해 주세요.',
  },
} satisfies Record<SyncStatus, SyncStatusPresentation>;

type AuthStatusPresentation = {
  isSignedIn: boolean;
  showBackupPrompt: boolean;
};

export const AUTH_STATUS_PRESENTATION = {
  loading: {
    isSignedIn: false,
    showBackupPrompt: true,
  },
  'signed-out': {
    isSignedIn: false,
    showBackupPrompt: true,
  },
  'signed-in': {
    isSignedIn: true,
    showBackupPrompt: false,
  },
  unconfigured: {
    isSignedIn: false,
    showBackupPrompt: true,
  },
} satisfies Record<AuthStatus, AuthStatusPresentation>;
