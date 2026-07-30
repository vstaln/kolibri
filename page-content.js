// Lesson demo labels, hints, feedback, and dialogue kept separate from main prose.
export const lesson = {
  task: 'The tool currently treats every expense as optional. Change the rule so food, transport, and housing are recognized as essential expenses.',
  reflection: 'Where in your own life do you make the same kind of decision repeatedly from similar information?',
  followUp: 'Describe the input, the decision being made, and the result you would want. You do not need to build it yet.',
  hints: [
    'Look at the category attached to each expense. Which categories should produce a different result?',
    'Try checking whether the category belongs to a small collection of essential categories.',
    'function isMember(value, list) {\n  return list.includes(value.toLowerCase());\n}',
  ],
  feedback: {
    food: 'Food is still being treated as optional.',
    transport: 'Transport is recognized, but housing is not.',
    streaming: 'The rule recognizes essential expenses, but it also marks streaming as essential.',
    none: 'The function returned no usable result.',
    pass: 'The rule now recognizes food, transport, and housing as essential expenses.',
  },
};

export const helpDialogue = [
  { who: 'Learner', text: 'The test still fails, but the output looks right to me.' },
  { who: 'Kolibri', text: 'Which expense categories does your rule currently treat as essential? Compare that list with the requirement before changing the code again.' },
  { who: 'Learner', text: 'I included food and housing, but not transport.' },
  { who: 'Kolibri', text: 'Then the output may look right for the examples you noticed while still failing the full requirement. Check the transport record and run it again.' },
];

export const starterCode = `const expenses = [
  { name: 'Food', category: 'food', amount: 45000 },
  { name: 'Transport', category: 'transport', amount: 20000 },
  { name: 'Streaming', category: 'streaming', amount: 59000 },
  { name: 'Housing', category: 'housing', amount: 1500000 },
  { name: 'Coffee', category: 'coffee', amount: 28000 },
];

function isEssential(category) {
  return false;
}`;

export const STORAGE_KEY = 'kolibri-expense-demo-v1';
