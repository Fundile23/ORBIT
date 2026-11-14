import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { usePersonal } from '@/lib/session';
import type { AvatarTone } from '@/lib/avatar-tone';
import type { AvatarActivity, AvatarReactionEvent } from '@/lib/avatar-presence';

type Expression = { tone: AvatarTone; activity: AvatarActivity; reaction?: AvatarReactionEvent | null };
const neutral: Expression = { tone: 'neutral', activity: 'idle', reaction: null };
const ExpressionContext = createContext<Expression & { setExpression: (expression: Expression) => void }>({
  ...neutral, setExpression: () => undefined,
});

/** Ephemeral, route- and account-scoped. Never stored or sent to an API. */
export function AvatarExpressionProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { userId, signedIn } = usePersonal();
  const scope = `${signedIn ? userId : 'public'}:${location}`;
  const [state, setState] = useState<Expression & { scope: string }>({ ...neutral, scope });
  const setExpression = useCallback((expression: Expression) => {
    setState((old) => old.scope === scope && old.tone === expression.tone && old.activity === expression.activity
      && old.reaction?.kind === expression.reaction?.kind && old.reaction?.key === expression.reaction?.key
      ? old : { ...expression, scope });
  }, [scope]);
  const effective = state.scope === scope ? state : neutral;
  const value = useMemo(() => ({
    tone: effective.tone, activity: effective.activity, reaction: effective.reaction, setExpression,
  }), [effective.tone, effective.activity, effective.reaction, setExpression]);
  return <ExpressionContext.Provider value={value}>{children}</ExpressionContext.Provider>;
}

export const useAvatarExpression = () => useContext(ExpressionContext);
