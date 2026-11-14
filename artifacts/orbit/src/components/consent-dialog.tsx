import { useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { getGetOverviewQueryKey, getGetSettingsQueryKey, useUpdateSettings } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { describeError } from '@/lib/errors';

type Props = { open: boolean; onOpenChange: (o: boolean) => void; onConsented: () => void };

export function ConsentDialog({ open, onOpenChange, onConsented }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const update = useUpdateSettings();

  const accept = () => {
    update.mutate(
      { data: { aiConsent: true } },
      {
        onSuccess: (settings) => {
          qc.setQueryData(getGetSettingsQueryKey(), settings);
          qc.invalidateQueries({ queryKey: getGetOverviewQueryKey() });
          onOpenChange(false);
          onConsented();
        },
        onError: (e) => toast({ title: 'Could not save your choice', description: describeError(e), variant: 'destructive' }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-border bg-popover sm:max-w-lg">
        <DialogHeader>
          <span className="mb-2 grid h-11 w-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <DialogTitle className="font-display text-xl">Before we talk</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Messages you write here are sent to a hosted AI model to generate replies. To do that, ORBIT’s server reads your stored content (it is decrypted server-side) and passes it to the AI provider. Conversations stay in your private ORBIT account so you can return to them.
              </p>
              <p>
                ORBIT is a companion for reflection. It is not a clinician, does not diagnose or prescribe, and cannot contact anyone on your behalf. For urgent concerns, follow your own emergency guidance.
              </p>
              <p>You can withdraw this consent at any time in Settings.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)} data-testid="button-consent-decline">
            Not now
          </Button>
          <Button className="rounded-full" onClick={accept} disabled={update.isPending} data-testid="button-consent-accept">
            {update.isPending ? 'Saving…' : 'I understand, continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
