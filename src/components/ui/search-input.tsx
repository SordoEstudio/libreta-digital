import { Search } from 'lucide-react'
import { cn } from 'cn'
import { Input } from './input'

export function SearchInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
      <Input className={cn('pl-7', className)} {...props} />
    </div>
  )
}
