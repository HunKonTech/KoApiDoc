import { describe, expect, it } from 'vitest';
import { matchesSearch, searchWords } from '../static/macro-ui/src/lib/operationSearch';

const op = {
  tag: 'books',
  method: 'get',
  path: '/books/{bookId}',
  summary: 'Get a book',
  operationId: 'getBook',
};

describe('operation search', () => {
  it('splits the phrase into lower-case words', () => {
    expect(searchWords('  GET   /Books ')).toEqual(['get', '/books']);
    expect(searchWords('   ')).toEqual([]);
  });

  it.each(['', 'books', 'BOOKS', 'get /books', '{bookId}', 'a book', 'getbook', 'book get'])(
    'matches %j',
    (phrase) => {
      expect(matchesSearch(searchWords(phrase), op)).toBe(true);
    },
  );

  it.each(['post', 'orders', 'books delete'])('does not match %j', (phrase) => {
    expect(matchesSearch(searchWords(phrase), op)).toBe(false);
  });

  it('ignores missing or non-text fields', () => {
    expect(matchesSearch(['x'], { tag: 'default', method: 'get', path: '/', summary: 42 })).toBe(
      false,
    );
    expect(matchesSearch(['default'], { tag: 'default', method: 'get', path: '/' })).toBe(true);
  });
});
