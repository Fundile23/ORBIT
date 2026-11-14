export const exerciseLibrary = [
  {
    id: "gentle-breathing", title: "A moment to breathe", category: "breathing",
    durationMinutes: 2, description: "A gentle rhythm to help you pause and settle. No breath holds required.",
    steps: [
      "Find a comfortable, safely secured position. Keep any mission-required restraints in place.",
      "Let your shoulders soften. Breathe naturally for a few moments.",
      "If comfortable, breathe in gently for 4 seconds, then out for 6 seconds. Do not force the rhythm.",
      "Continue for up to two minutes. You can pause or stop whenever you like.",
      "Return to your natural breathing. If you feel dizzy, short of breath or uncomfortable, stop and seek medical guidance if symptoms persist.",
    ],
  },
  {
    id: "sensory-grounding", title: "Here, in this moment", category: "grounding",
    durationMinutes: 3, description: "Reconnect with your surroundings through your senses, wherever you are.",
    steps: [
      "Stay safely positioned and take a natural breath.",
      "Notice five things you can see: shapes, colours, labels or light.",
      "Notice four points of contact: clothing, a handrail, your seat or a safe nearby surface.",
      "Listen for three sounds without judging them.",
      "Notice two scents, or recall two familiar scents if the environment has none.",
      "Notice one taste, or one small thing you appreciate right now. There is no need to get the exercise perfect.",
    ],
  },
  {
    id: "body-release", title: "Release the day", category: "relaxation",
    durationMinutes: 5, description: "A soft body scan for moments of tension. No stretching or exertion needed.",
    steps: [
      "Remain comfortably secured. Skip any area that is painful or injured.",
      "Notice your jaw and forehead. Let them relax without forcing.",
      "Move your attention to your shoulders, hands and arms.",
      "Notice your breathing, abdomen and back, allowing any comfortable softening.",
      "Bring attention to your legs and feet without needing them to touch a floor.",
      "Take your time returning attention to the room. Stop if this increases distress or discomfort.",
    ],
  },
  {
    id: "home-connection", title: "A little closer to home", category: "reflection",
    durationMinutes: 5, description: "Make space for a familiar memory and a small, realistic connection.",
    steps: [
      "Choose a familiar person, place or everyday ritual you miss.",
      "Recall one detail: a sound, a smell or a short conversation.",
      "Write a few sentences about what this memory means to you. It is okay if it brings mixed feelings.",
      "If helpful, draft a message to someone you trust. Consider mission communication windows and delays; there is no need to send it now.",
      "Choose one small comforting ritual you can safely do today.",
    ],
  },
  {
    id: "sleep-wind-down", title: "Prepare for rest", category: "relaxation",
    durationMinutes: 5, description: "A brief transition out of a busy day, without promising sleep.",
    steps: [
      "Follow your mission's sleep schedule and safety procedures.",
      "If permitted, reduce non-essential light and stimulation.",
      "Write down one unfinished thought and when you can return to it.",
      "Let your breathing find its own comfortable pace, noticing each exhale.",
      "Rest without trying to force sleep. Discuss persistent sleep disruption with the medical team; do not change medication on ORBIT's advice.",
    ],
  },
  {
    id: "crew-reset", title: "Before a difficult conversation", category: "reflection",
    durationMinutes: 4, description: "Separate observations, feelings and needs before a crew discussion.",
    steps: [
      "Pause until it is safe and appropriate to reflect, away from time-critical tasks.",
      "Describe what happened using only observable facts.",
      "Name what you felt, without assigning motives to someone else.",
      "Identify one need or practical request you could communicate respectfully.",
      "Choose a suitable time to talk. For safety concerns, harassment or serious conflict, use your mission's designated support channels.",
    ],
  },
] as const;
