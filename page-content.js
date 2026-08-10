// Three-stage lesson demonstration content for the course IDE: Learn
// (expense checker) -> Build & Debug (reminders) -> Final Project (invoices).
// All copy the "Kolibri AI" shows and all code the editor renders.
export const lessonDemo = {
  learn: {
    file: 'expenses.js',
    // The lesson copy sits above the demo; the chat opens by teaching the
    // concept, then points at the code.
    intro: [
      'The concept is a condition: a true-or-false decision that changes what the program does. isEssential() is the condition in this file — the program asks it about every expense.',
      'Read the idea, change the code, and see what happens. The relevant file is already open.',
    ],
    task: 'Change the rule so food, transport, and housing are recognized as essential expenses.',
    prompts: [
      { label: 'Explain the condition', q: 'Explain the condition.', a: 'The condition is the decision inside isEssential(): right now it is a bare return false, so every category comes out Optional.' },
      { label: 'Why does the function return false?', q: 'Why does the function return false?', a: 'Because the body of isEssential() never looks at the category. It returns false unconditionally, so every expense is marked Optional.' },
      { label: 'Give me a hint', q: 'Give me a hint.', a: 'Look at the category attached to each expense, then decide which categories should produce a different result.' },
    ],
    // Scripted chat: the learner asks, the AI answers, a patch is proposed.
    qa: [
      { attach: 'expenses.js · line 10', q: 'Why does this always return optional?', a: 'isEssential() returns false for every category, so the check marks everything Optional. The function needs to compare the category against the essential ones and return true when it matches.' },
      { attach: 'expenses.js · line 10', q: 'Can you show the change?', a: null },
    ],
    patch: { file: 'expenses.js', summary: '1 function' },
    code: {
      starter: `const expenses = [
  { name: 'Food', category: 'food', amount: 45000 },
  { name: 'Transport', category: 'transport', amount: 20000 },
  { name: 'Streaming', category: 'streaming', amount: 59000 },
  { name: 'Housing', category: 'housing', amount: 1500000 },
  { name: 'Coffee', category: 'coffee', amount: 28000 },
];

function isEssential(category) {
  return false;
}`,
      solved: `const expenses = [
  { name: 'Food', category: 'food', amount: 45000 },
  { name: 'Transport', category: 'transport', amount: 20000 },
  { name: 'Streaming', category: 'streaming', amount: 59000 },
  { name: 'Housing', category: 'housing', amount: 1500000 },
  { name: 'Coffee', category: 'coffee', amount: 28000 },
];

function isEssential(category) {
  return ['food', 'transport', 'housing'].includes(category.toLowerCase());
}`,
      // 1-indexed line that differs between starter and solved.
      changedLines: [10],
    },
    checkRows: [
      'Food          Essential',
      'Transport     Essential',
      'Streaming     Optional',
      'Housing       Essential',
      'Coffee        Optional',
    ],
    checkPass: 'The rule now recognizes food, transport, and housing as essential expenses.',
    status: 'STATUS: expenses.js · change applied · check passed',
  },

  debug: {
    file: 'reminders.js',
    intro: 'Short bug report: a reminder dated yesterday still appears as upcoming.',
    qa: [
      { attach: 'reminders.js · lines 1–8', q: 'Where should I look?', a: 'statusFor() decides between "overdue" and "upcoming" — trace what it returns when the due date is before today. parseDate() is a helper; make sure it parses the dates you think it does.' },
    ],
    files: ['reminders.js', 'reminder-list.js', 'storage.js', 'reminders.test.js'],
    code: {
      starter: `const REMINDERS = loadReminders();

function statusFor(reminder, today) {
  const due = parseDate(reminder.due);
  if (due < today) return 'upcoming';
  return 'overdue';
}

function upcomingList(today) {
  return REMINDERS.filter((r) => statusFor(r, today) === 'upcoming');
}`,
      // The learner's fix, typed by hand during the demo.
      solved: `const REMINDERS = loadReminders();

function statusFor(reminder, today) {
  const due = parseDate(reminder.due);
  if (due < today) return 'overdue';
  return 'upcoming';
}

function upcomingList(today) {
  return REMINDERS.filter((r) => statusFor(r, today) === 'upcoming');
}`,
      // 1-indexed line the learner retypes.
      changedLines: [5],
    },
    tests: {
      fail: '1 failed · 4 passed',
      failDetail: 'FAIL — a reminder dated yesterday still appears as upcoming.\nexpected status: overdue',
      pass: '5 passed · all green',
    },
    status: 'STATUS: 4 files · 5 tests passing',
  },

  project: {
    file: 'app.js',
    // Simulated: the learner types the problem that bothers them; the scope
    // drafts itself from their words. The AI answers with a plan, not a chat.
    problem: 'Invoices I keep forgetting to follow up on.',
    reply: "That's enough to start — I'm drafting the README and the data model now.",
    plan: [
      '1. List the things you have.',
      '2. Mark each one done or still open.',
      '3. Show only the open ones.',
    ],
    patch: { file: 'app.js', summary: 'data model' },
    // Lines appended below the README when the data model is drafted.
    patchAdd: [
      `const items = [
  { id: 1, note: 'First thing', done: false },
  { id: 2, note: 'Second thing', done: false },
];`,
    ],
    // The learner's manual edit: item 1 is already done.
    manualLine: 2,
    manualText: `  { id: 1, note: 'First thing', done: true },`,
    previewBefore: 'First incomplete version',
    previewAfter: '1 open item · 1 done',
    status: 'STATUS: app.js · 1/4 requirements complete',
  },
};
