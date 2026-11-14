import type { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  pending?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
};

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Delete', pending, disabled, onConfirm, children }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl border-border bg-popover">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full" data-testid="button-confirm-cancel">Keep it</AlertDialogCancel>
          <AlertDialogAction
            className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={pending || disabled}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            data-testid="button-confirm-action"
          >
            {pending ? 'Working…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
