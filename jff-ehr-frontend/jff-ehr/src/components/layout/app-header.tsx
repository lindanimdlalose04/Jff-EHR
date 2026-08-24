interface AppHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  userInitials: string;
  actions?: React.ReactNode;
}

export function AppHeader({
  icon,
  title,
  subtitle,
  userInitials,
  actions,
}: AppHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-card bg-surface px-[18px] py-3.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-none bg-accent text-white">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[15px] font-medium text-primary">{title}</div>
        {subtitle && <div className="text-xs text-muted">{subtitle}</div>}
      </div>
      {actions}
      <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-accent-tint text-xs font-medium text-accent">
        {userInitials}
      </div>
    </header>
  );
}
