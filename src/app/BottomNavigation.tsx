import { cn } from '@/shared/lib/cn';

export type AppTab = 'today' | 'history';

const TABS: Array<{
  value: AppTab;
  label: string;
  icon: 'today' | 'history';
}> = [
  { value: 'today', label: '오늘', icon: 'today' },
  { value: 'history', label: '기록', icon: 'history' },
];

function TabIcon({ icon }: { icon: 'today' | 'history' }) {
  if (icon === 'today') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="size-6"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 3v3M18 3v3M4 8h16" />
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
    </svg>
  );
}

export function BottomNavigation({
  activeTab,
  onTabChange,
}: {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E8EB]/90 bg-white/95 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgb(0_0_0/0.06)] backdrop-blur-md"
      aria-label="주요 메뉴"
    >
      <div
        className="mx-auto grid max-w-lg grid-cols-2 gap-2"
        role="tablist"
      >
        {TABS.map((tab) => {
          const selected = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[12px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3182F6]',
                selected
                  ? 'bg-[#E8F3FF] text-[#3182F6]'
                  : 'text-[#8B95A1] hover:bg-[#F9FAFB]',
              )}
            >
              <TabIcon icon={tab.icon} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
