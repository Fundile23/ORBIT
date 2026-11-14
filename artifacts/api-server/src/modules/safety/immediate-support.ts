// A conservative extra guard for explicit high-risk wording. Not a clinical
// assessment or comprehensive classifier: the model also receives crisis rules.
export function immediateSupport(text: string, contact: string, protocol: string): string | null {
  const directRisk = /\b(kill myself|end my life|suicid(?:e|al)|hurt myself|harm myself|self[- ]harm|want to die|going to die by|overdos(?:e|ed|ing))\b/i.test(text);
  if (!directRisk) return null;
  const who = contact ? `your designated medical contact (${contact})` : "the designated onboard medical professional";
  return `I'm glad you told me. Your immediate safety matters. Are you in danger right now, or have you already taken steps to hurt yourself?\n\nPlease contact ${who} now and, if it is safe, ask a trusted crewmate to stay with you. If you have already harmed yourself or taken something, seek urgent medical help immediately. If you're on Earth, contact local emergency services if there is immediate danger.\n\n${protocol ? `Your saved mission guidance is:\n${protocol}` : "No approved mission emergency procedure has been configured in ORBIT. Follow your mission's approved emergency procedures; I cannot invent them."}\n\nI'm an AI companion, not emergency care. I cannot notify anyone or arrange help on your behalf.`;
}
