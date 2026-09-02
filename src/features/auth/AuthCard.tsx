import { useState, type FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import type { AuthStatus } from './useSupabaseAuth';

const AUTH_MODES = ['sign-in', 'sign-up'] as const;

type AuthMode = (typeof AUTH_MODES)[number];

type AuthModePresentation = {
  tabLabel: string;
  submitLabel: string;
  passwordAutoComplete: 'current-password' | 'new-password';
  failureMessage: string;
};

const AUTH_MODE_PRESENTATION = {
  'sign-in': {
    tabLabel: '로그인',
    submitLabel: '로그인',
    passwordAutoComplete: 'current-password',
    failureMessage:
      '로그인하지 못했어요. 이메일 확인 여부와 비밀번호를 확인해 주세요.',
  },
  'sign-up': {
    tabLabel: '처음 사용',
    submitLabel: '가입하기',
    passwordAutoComplete: 'new-password',
    failureMessage: '가입하지 못했어요. 이메일과 비밀번호를 확인해 주세요.',
  },
} satisfies Record<AuthMode, AuthModePresentation>;

function assertNever(value: never): never {
  throw new Error(`처리하지 않은 상태입니다: ${String(value)}`);
}

function getSubmitLabel(mode: AuthMode, submitting: boolean): string {
  if (submitting) return '처리 중…';
  return AUTH_MODE_PRESENTATION[mode].submitLabel;
}

type AuthCardProps = {
  status: AuthStatus;
  email?: string;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<boolean>;
  onSignOut: () => Promise<void>;
};

export function AuthCard({
  status,
  email,
  onSignIn,
  onSignUp,
  onSignOut,
}: AuthCardProps) {
  const [inputEmail, setInputEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  switch (status) {
    case 'loading':
      return (
        <Card>
          <p className="text-[15px] font-semibold text-[#4E5968]">
            동기화 계정을 확인하고 있어요.
          </p>
        </Card>
      );
    case 'unconfigured':
      return (
        <Card className="border border-[#FFE0B2] bg-[#FFF9F0]">
          <p className="text-[16px] font-bold text-[#191F28]">
            현재 이 기기에 안전하게 저장 중
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-[#6B7684]">
            배포 환경에 Supabase URL과 publishable key를 설정하면 서버 백업도
            활성화됩니다.
          </p>
        </Card>
      );
    case 'signed-in':
      return (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_2px_12px_rgb(0_0_0/0.06)]">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#8B95A1]">
              Supabase 동기화 계정
            </p>
            <p className="truncate text-[14px] font-bold text-[#333D4B]">
              {email}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="shrink-0"
            onClick={() => void onSignOut()}
          >
            로그아웃
          </Button>
        </div>
      );
    case 'signed-out':
      break;
    default:
      return assertNever(status);
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!inputEmail.trim()) return;

    setSubmitting(true);
    setMessage(null);
    try {
      switch (mode) {
        case 'sign-up': {
          const signedIn = await onSignUp(inputEmail.trim(), password);
          setMessage(
            signedIn
              ? '가입과 로그인이 완료됐어요.'
              : '확인 메일을 보냈어요. 이메일 확인 후 로그인해 주세요.',
          );
          if (!signedIn) setMode('sign-in');
          break;
        }
        case 'sign-in':
          await onSignIn(inputEmail.trim(), password);
          setMessage('로그인했어요. 기록을 동기화하고 있습니다.');
          break;
        default:
          assertNever(mode);
      }
    } catch {
      setMessage(AUTH_MODE_PRESENTATION[mode].failureMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <h2 className="text-[18px] font-bold text-[#191F28]">
        운동 기록 백업하기
      </h2>
      <p className="mt-1 text-[14px] leading-relaxed text-[#8B95A1]">
        로그인하면 이 기기의 기록이 Supabase에 자동 동기화됩니다.
      </p>
      <div className="mt-4 grid grid-cols-2 rounded-2xl bg-[#F2F4F6] p-1">
        {AUTH_MODES.map((value) => (
          <button
            key={value}
            type="button"
            className={`rounded-xl px-3 py-2 text-[13px] font-bold ${
              mode === value
                ? 'bg-white text-[#191F28] shadow-sm'
                : 'text-[#8B95A1]'
            }`}
            onClick={() => {
              setMode(value);
              setMessage(null);
            }}
          >
            {AUTH_MODE_PRESENTATION[value].tabLabel}
          </button>
        ))}
      </div>
      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="sync-email">이메일</Label>
          <Input
            id="sync-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
            value={inputEmail}
            onChange={(event) => setInputEmail(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sync-password">비밀번호</Label>
          <Input
            id="sync-password"
            type="password"
            autoComplete={AUTH_MODE_PRESENTATION[mode].passwordAutoComplete}
            minLength={8}
            placeholder="8자 이상"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {getSubmitLabel(mode, submitting)}
        </Button>
      </form>
      {message ? (
        <p className="mt-3 text-[13px] font-semibold text-[#4E5968]">
          {message}
        </p>
      ) : null}
    </Card>
  );
}
