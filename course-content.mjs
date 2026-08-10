export const course = {
  schemaVersion: 1,
  trackId: 'js',
  id: 'js-foundations',
  title: 'JavaScript Foundations',
  modules: [
    {
      id: 'js-foundations-m01',
      title: 'Values and output',
      lessons: [
        {
          id: 'js-foundations-m01-l01',
          title: 'Variables and output',
          objective: 'Use simple values and output to make a program say something precise.',
          glossary: {
            const: 'A variable binding that is not reassigned.',
            string: 'Text surrounded by quotation marks.',
            console: 'The program output area used to inspect a value.',
            let: 'A variable binding that can be reassigned.',
            number: 'A numeric value used for counting or measuring.',
            array: 'An ordered list of values.',
            dom: 'The browser representation of the page that code can update.',
          },
          completion: 'You finished the JavaScript Foundations preview — 3 challenges.',
          challenges: [
            {
              id: 'js-foundations-m01-l01-c01',
              position: 1,
              title: 'Print a greeting',
              concept: 'const',
              vocabulary: ['const', 'string', 'console'],
              prerequisites: [],
              instruction: 'Change the greeting so the program prints exactly: Hello, Ada',
              starter: "const greeting = 'Hello';\nconsole.log(greeting);",
              tests: [
                {
                  id: 'console-output',
                  type: 'console-lines',
                  expected: ['Hello, Ada'],
                  failure: 'The console should contain exactly Hello, Ada.',
                },
              ],
              hints: [
                { level: 'nudge', text: 'Find the text stored in greeting.' },
                { level: 'direction', text: 'The value between the quotes is what gets printed.' },
                { level: 'walkthrough', text: 'Change the string value, then run the program again.' },
              ],
              feedback: {
                pass: 'The greeting is exact. You changed a value and checked the result.',
                runtime: 'The program raised an error before it could print the greeting.',
                timeout: 'The program took too long to finish. Remove the loop and run it again.',
                failures: { 'console-output': 'Read the expected line carefully, including its punctuation.' },
              },
              nextId: 'js-foundations-m01-l01-c02',
            },
            {
              id: 'js-foundations-m01-l01-c02',
              position: 2,
              title: 'Update a count',
              concept: 'let',
              vocabulary: ['let', 'number', 'console'],
              prerequisites: ['js-foundations-m01-l01-c01'],
              instruction: 'Start count at 2, update it once, and print exactly: 3',
              starter: "let count = 2;\nconsole.log(count);",
              tests: [
                {
                  id: 'console-output',
                  type: 'console-lines',
                  expected: ['3'],
                  failure: 'The console should contain exactly 3.',
                },
              ],
              hints: [
                { level: 'nudge', text: 'The program starts with count at 2.' },
                { level: 'direction', text: 'Reassign count to a value one larger before printing it.' },
                { level: 'walkthrough', text: 'Use an assignment such as count = count + 1, then run the program.' },
              ],
              feedback: {
                pass: 'The count changed from 2 to 3 and the output is exact.',
                runtime: 'The program raised an error before it could print the count.',
                timeout: 'The program took too long to finish. Remove the loop and run it again.',
                failures: { 'console-output': 'The expected result is the number 3, printed on its own line.' },
              },
              nextId: 'js-foundations-m01-l01-c03',
            },
            {
              id: 'js-foundations-m01-l01-c03',
              position: 3,
              title: 'Render a list',
              concept: 'array',
              vocabulary: ['array', 'dom'],
              prerequisites: ['js-foundations-m01-l01-c02'],
              instruction: 'Render the two fruit names into #app, separated by a comma and a space.',
              starter: "const fruits = ['apples', 'oranges'];\ndocument.querySelector('#app').textContent = fruits[0];",
              tests: [
                {
                  id: 'app-output',
                  type: 'app-text',
                  expected: 'apples, oranges',
                  failure: 'The page should show apples, oranges.',
                },
              ],
              hints: [
                { level: 'nudge', text: 'The array already contains both fruit names.' },
                { level: 'direction', text: 'Read both values from the array and combine them with a comma and a space.' },
                { level: 'walkthrough', text: 'Use the array join method with the separator ", " before assigning textContent.' },
              ],
              feedback: {
                pass: 'The array is now visible in the page exactly as requested.',
                runtime: 'The program raised an error before it could update #app.',
                timeout: 'The program took too long to finish. Remove the loop and run it again.',
                failures: { 'app-output': 'Check that both array values appear with one comma and one space.' },
              },
              nextId: null,
            },
          ],
        },
      ],
    },
  ],
};

