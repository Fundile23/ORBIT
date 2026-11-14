import { WifiOff } from 'lucide-react';
import { useOnline } from '@/hooks/use-online';

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-accent px-4 py-2 text-xs text-accent-foreground" data-testid="status-offline">
      <WifiOff className="h-3.5 w-3.5" aria-hidden />
      You’re offline. Downloaded exercises still work; conversations and saving will wait until you reconnect.
    </div>
  );
}
