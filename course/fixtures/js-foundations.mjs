const code = (...lines) => lines.join('\n');

export const fixtures = {
  'js-foundations-m01-l01-c01': {
    solutions: [
      code("const greeting = 'Hello, Ada';", 'console.log(greeting);'),
      code("let greeting = 'Hello, Ada';", 'console.log(greeting);'),
    ],
    wrong: [
      { name: 'missing surname', code: code("const greeting = 'Hello, Ad';", 'console.log(greeting);') },
      { name: 'wrong capitalization', code: code("const greeting = 'hello, Ada';", 'console.log(greeting);') },
    ],
  },
  'js-foundations-m01-l01-c02': {
    solutions: [
      code('let count = 2;', 'count = count + 1;', 'console.log(count);'),
      code('let count = 2;', 'count += 1;', 'console.log(count);'),
    ],
    wrong: [
      { name: 'never increments', code: code('let count = 2;', 'console.log(count);') },
      { name: 'increments twice', code: code('let count = 2;', 'count += 2;', 'console.log(count);') },
    ],
  },
  'js-foundations-m01-l01-c03': {
    solutions: [
      code("const fruits = ['apples', 'oranges'];", "document.querySelector('#app').textContent = fruits.join(', ');"),
      code("const fruits = ['apples', 'oranges'];", "document.getElementById('app').textContent = fruits[0] + ', ' + fruits[1];"),
    ],
    wrong: [
      { name: 'only first value', code: code("const fruits = ['apples', 'oranges'];", "document.querySelector('#app').textContent = fruits[0];") },
      { name: 'wrong separator', code: code("const fruits = ['apples', 'oranges'];", "document.querySelector('#app').textContent = fruits.join(' ');") },
    ],
  },
};

