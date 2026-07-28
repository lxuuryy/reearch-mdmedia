export const STATEMENTS = [
  "I like knowing exactly what's expected before I start something",
  "Repetitive work drains me, even when I'm good at it",
  "It matters to me that people know what I contributed",
  "I do my best work when the team feels close",
  "I'd take on a harder role if I'd learn faster in it",
  "The best part of this job is knowing a client's business actually grew",
  "Clear processes make my work better, not worse",
  "A brief that's completely different from the last one energises me",
  "Being trusted with the hardest job means a lot to me",
  "I'd stay somewhere harder for people I love working with",
  "I ask for feedback even when it's uncomfortable to hear",
  "Work that has no visible impact on anything feels pointless",
  "Unexpected changes to the plan throw off my whole day",
  "I try new tools and approaches without being asked to",
  "I notice when my work goes unacknowledged",
  "Tension in the team affects how well I work",
  "I spend my own time learning things that make me better at this",
  "I help other people here without being asked",
  "I'd rather do something well the same way than experiment and risk it",
  "I'd rather juggle several accounts than go deep on one",
  "I want my work to be visibly better than average",
  "I check in on how people are doing",
  "Standing still and not improving makes me restless",
  "I want the work I do to matter to someone beyond us",
];

export type Driver = {
  name: string;
  qs: number[];
  blurb: string;
  desc: string;
  watch: string;
  lands: string;
  flat: string;
};

export const DRIVERS: Driver[] = [
  {
    name: "Certainty",
    qs: [1, 7, 13, 19],
    blurb: "Stability, clarity, control",
    desc: "You need to know where you stand. Ambiguity costs you more energy than difficulty does. You'll do bold work, but you need the ground rules first — and to know a wrong call won't be held against you.",
    watch: "Watch for: needing the plan before you'll move.",
    lands: 'Clear scope, written decision rights, "a wrong call is fine" said out loud',
    flat: "Surprise changes, vague stretch goals, being publicly singled out",
  },
  {
    name: "Variety",
    qs: [2, 8, 14, 20],
    blurb: "Challenge, change, novelty",
    desc: "Sameness is what burns you out, not workload. You need new problems, different clients, changing formats.",
    watch: "Watch for: starting more than you finish.",
    lands: "A new account, a different format, running something nobody's done here",
    flat: "Same client, same deliverable, indefinitely",
  },
  {
    name: "Significance",
    qs: [3, 9, 15, 21],
    blurb: "Recognition, being trusted, standing out",
    desc: "You want your contribution seen and attributed. Being handed the hard job is a compliment you feel.",
    watch: "Watch for: quietly deflating when good work goes unmentioned.",
    lands: "Named credit on published case studies, presenting to the client, the hardest brief",
    flat: "Quiet appreciation nobody else hears",
  },
  {
    name: "Connection",
    qs: [4, 10, 16, 22],
    blurb: "Belonging, the team, relationships",
    desc: "The team is why the work is good. You'll absorb a lot to keep things harmonious.",
    watch: "Watch for: staying quiet when something needs saying, because saying it would cause friction.",
    lands: "Team wins, shared goals, being asked to help someone else level up",
    flat: "Individual leaderboards that pit people against each other",
  },
  {
    name: "Growth",
    qs: [5, 11, 17, 23],
    blurb: "Learning, getting better, being stretched",
    desc: "You measure a job by whether you're better than you were. A plateau feels worse to you than pressure.",
    watch: "Watch for: chasing new skills over finishing current work.",
    lands: "A course, a skill, mentoring time, a stretch that's slightly beyond them",
    flat: "Cash instead of development",
  },
  {
    name: "Contribution",
    qs: [6, 12, 18, 24],
    blurb: "Real impact, work that matters",
    desc: "You need the work to matter. Metrics that don't connect to something real feel hollow.",
    watch: "Watch for: frustration with clients who won't take advice.",
    lands: "Seeing the client's actual results, hearing the client say it worked",
    flat: "Volume metrics disconnected from outcomes",
  },
];

export type Reflect =
  | { kind: "open"; q: string; options?: undefined }
  | { kind: "choice"; q: string; options: string[] };

export const REFLECT: Reflect[] = [
  { kind: "open", q: "Think of a time here you felt genuinely proud of your work. What actually happened?" },
  { kind: "open", q: "What's something you'd love to be trusted with that you aren't yet?" },
  {
    kind: "choice",
    q: "If we could only give you one of these next quarter, which would you pick?",
    options: [
      "More money",
      "More recognition for what you do",
      "More freedom to make your own calls",
      "More learning and new skills",
      "More visible impact on clients' businesses",
    ],
  },
];

export const SCENARIOS = [
  {
    q: "A shoot is six weeks away. A supplier tells you they can't get you what you need in time.",
    o: ["Scale the shoot back to what's possible", "Push the date", "Ask them why it takes six weeks", "Find a different supplier"],
  },
  {
    q: "Your client messages at 8pm Sunday. Something's broken on their end and they're stressed.",
    o: [
      "Reply now and sort it",
      "Reply now to acknowledge, fix it Monday morning",
      "Leave it until Monday — it's the weekend",
      "Forward it to whoever's technically responsible",
    ],
  },
  {
    q: "A client asks for something clearly outside their scope, casually, like it's nothing.",
    o: [
      "Just do it, it's quicker than the conversation",
      "Do it this once and mention it's outside scope",
      "Say you'd love to and you'll send through the scope and cost",
      "Tell them it's not included",
    ],
  },
  {
    q: "A colleague disagrees with your direction on a shared account, publicly in Slack.",
    o: ["Defend your position in the thread", "Take it to a call with them", "Ask Divina to settle it", "Let it go — not worth the friction"],
  },
  {
    q: "Your account has been flat for six weeks. Nobody has said anything.",
    o: [
      "Keep going — the client isn't complaining",
      "Raise it in the weekly with what you think is wrong",
      "Try something different and see if it moves",
      "Ask the client if they're happy",
    ],
  },
  {
    q: "You've made a mistake on a client deliverable. It's gone out. They haven't noticed.",
    o: ["Fix it quietly and say nothing", "Tell the client straight away", "Tell your team first, then decide together", "Wait and see if they notice"],
  },
  {
    q: "You've been asked to do something you don't know how to do.",
    o: ["Ask someone how", "Work it out yourself first, ask if you're still stuck", "Say it's not your skillset", "Attempt it and hope it's close enough"],
  },
  {
    q: "A client pushes back hard on price for extra work.",
    o: ["Discount it to keep them happy", "Hold the price and explain the value", "Offer a smaller scope at a lower price", "Take it to Divina"],
  },
  {
    q: "You get a brief that's vague. The deadline is tight.",
    o: ["Start on your best interpretation", "Go back with specific questions before starting", "Ask for more time", "Do the parts you understand and flag the rest"],
  },
  {
    q: "You notice one of your client's competitors doing something clever that would work for your client. Nobody asked you to look.",
    o: [
      "Mention it at the next fortnightly meeting",
      "Work it into a proposal and send it",
      "Note it and move on — it's outside the brief",
      "Send it to the client straight away",
    ],
  },
  {
    q: "You've finished everything on your list at 2pm.",
    o: ["Take the win, go home early", "Ask if anyone needs help", "Find something that would move one of your accounts", "Get ahead on next week"],
  },
  {
    q: "A brand-new client is being onboarded and you notice their agreement hasn't been signed yet. It's not your account.",
    o: ["Say something to the account owner", "Say something to Abby", "Assume someone's handling it", "Nothing — not your job"],
  },
];

export const LETTERS = ["a", "b", "c", "d", "e"];
