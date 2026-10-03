import { cn } from 'cn'

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
      {Icon && <Icon className="size-12 text-muted-foreground/40" />}
      <div className="flex flex-col gap-1">
        <p className="font-medium text-muted-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground/70 max-w-xs">{description}</p>}
      </div>
      {action}
    </div>
  )
}
