import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyDCuEs_N8in_7h2Esmii91UTObj8r7n344",
  authDomain: "test-agent-88a4c.firebaseapp.com",
  projectId: "test-agent-88a4c",
  appId: "1:574214432022:web:a7b9f9bfccfc5df45cdc37",
});
const db = getFirestore(app);

// Displayed as 29/07/2026 9:58:34 AM in the admin, which renders in local time
// (UTC+10 on this machine) — so the stored UTC instant is 28/07 23:58:34Z.
const completedAt = Timestamp.fromDate(new Date("2026-07-28T23:58:34.000Z"));

const scenarios = [
  ["A shoot is six weeks away. A supplier tells you they can't get you what you need in time.", 3, "Find a different supplier"],
  ["Your client messages at 8pm Sunday. Something's broken on their end and they're stressed.", 0, "Reply now and sort it"],
  ["A client asks for something clearly outside their scope, casually, like it's nothing.", 1, "Do it this once and mention it's outside scope"],
  ["A colleague disagrees with your direction on a shared account, publicly in Slack.", 1, "Take it to a call with them"],
  ["Your account has been flat for six weeks. Nobody has said anything.", 2, "Try something different and see if it moves"],
  ["You've made a mistake on a client deliverable. It's gone out. They haven't noticed.", 2, "Tell your team first, then decide together"],
  ["You've been asked to do something you don't know how to do.", 1, "Work it out yourself first, ask if you're still stuck"],
  ["A client pushes back hard on price for extra work.", 2, "Offer a smaller scope at a lower price"],
  ["You get a brief that's vague. The deadline is tight.", 1, "Go back with specific questions before starting"],
  [
    "You notice one of your client's competitors doing something clever that would work for your client. Nobody asked you to look.",
    1,
    "Work it into a proposal and send it",
  ],
  ["You've finished everything on your list at 2pm.", 1, "Ask if anyone needs help"],
  [
    "A brand-new client is being onboarded and you notice their agreement hasn't been signed yet. It's not your account.",
    1,
    "Say something to Abby",
  ],
].map(([q, index, answer]) => ({ q, index, answer }));

const payload = {
  person: { name: "Renee", email: "", team: "Social media" },
  // Per-statement ratings were not recoverable — only the six totals survived.
  ratings: Object.fromEntries(Array.from({ length: 24 }, (_, n) => [`r${n}`, null])),
  scores: { Certainty: 18, Variety: 15, Significance: 13, Connection: 15, Growth: 17, Contribution: 17 },
  topTwo: ["Certainty", "Growth"],
  reflections: [
    {
      q: "Think of a time here you felt genuinely proud of your work. What actually happened?",
      index: null,
      answer:
        "Most the time when I do the briefs for clients and successfully produce everything on them smoothly. Knowing that I didn’t need help on it",
    },
    {
      q: "What's something you'd love to be trusted with that you aren't yet?",
      index: null,
      answer: "I think I’m pretty happy with the work/ people / jobs that I am trusted with.",
    },
    { q: "If we could only give you one of these next quarter, which would you pick?", index: 0, answer: "More money" },
  ],
  scenarios,
  completedAt,
  userAgent: "",
  restored: true,
  restoreNote: "Rebuilt after accidental deletion. Driver totals, reflections and scenarios are original; the 24 individual statement ratings were not recoverable.",
};

const targets = ["what-drives-you-responses"];
for (const name of targets) {
  try {
    const ref = await addDoc(collection(db, name), payload);
    console.log(`RESTORED into "${name}" as ${ref.id}`);
    process.exit(0);
  } catch (err) {
    console.log(`could not write to "${name}": ${err.code ?? err.message}`);
  }
}
console.log("FAILED to restore into any collection");
process.exit(1);
