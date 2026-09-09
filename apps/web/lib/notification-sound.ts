// Synthesized via Web Audio rather than an external audio file -- no asset to host, no licensing
// question, and it's a genuinely tiny amount of code for a short two-note chime. A bright,
// ascending major third (C6 -> E6) on soft sine oscillators, closer to a premium "positive"
// notification tone (Slack/iMessage-style) than a harsh beep -- meant to read as a business tool,
// not a game.
let sharedContext: AudioContext | null = null;

export function playMessageChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!sharedContext) sharedContext = new AudioContextClass();
    const ctx = sharedContext;
    // Browsers suspend a freshly-created AudioContext until a user gesture -- resuming is a no-op
    // once that's already happened, and harmless (just won't produce sound) if it hasn't yet.
    void ctx.resume();

    const now = ctx.currentTime;
    const notes = [
      { freq: 1046.5, start: 0, duration: 0.22 }, // C6
      { freq: 1318.5, start: 0.09, duration: 0.32 }, // E6
    ];
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = note.freq;
      const startAt = now + note.start;
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.22, startAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + note.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + note.duration + 0.05);
    }
  } catch {
    // A missed chime is never worth surfacing as an error.
  }
}
