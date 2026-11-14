import { Link } from 'wouter';
import { OrbitAvatar } from '@/components/orbit-avatar';
import { usePageMeta } from '@/hooks/use-page-meta';

export default function NotFound() {
  usePageMeta('Off course', 'This page drifted out of range.');
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <OrbitAvatar size={72} className="anim-float" />
      <h1 className="text-3xl font-light">This page drifted out of range</h1>
      <p className="text-sm text-muted-foreground">The link may be old, or the item may have been deleted.</p>
      <Link href="/" className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground" data-testid="link-404-home">Back to ORBIT</Link>
    </div>
  );
}
