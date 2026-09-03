const isAsciiWordCharacter = (character) => Boolean(character && /[A-Za-z0-9_]/.test(character));

const hasValidBoundary = (text, start, term) => {
  const end = start + term.length;
  const needsStartBoundary = isAsciiWordCharacter(term[0]);
  const needsEndBoundary = isAsciiWordCharacter(term.at(-1));

  return (!needsStartBoundary || !isAsciiWordCharacter(text[start - 1]))
    && (!needsEndBoundary || !isAsciiWordCharacter(text[end]));
};

const findAlias = (source, lowerSource, alias, fromIndex) => {
  const lowerAlias = alias.toLocaleLowerCase('en-US');
  let index = lowerSource.indexOf(lowerAlias, fromIndex);

  while (index !== -1 && !hasValidBoundary(source, index, alias)) {
    index = lowerSource.indexOf(lowerAlias, index + 1);
  }

  return index;
};

export function findGlossaryParts(text, entries) {
  if (typeof text !== 'string' || !text) return [{ type: 'text', text: text ?? '' }];

  const aliases = entries
    .flatMap((entry) => entry.terms.map((term) => ({ entry, term })))
    .sort((left, right) => right.term.length - left.term.length);
  const lowerText = text.toLocaleLowerCase('en-US');
  const parts = [];
  let cursor = 0;

  while (cursor < text.length) {
    let bestMatch = null;

    for (const candidate of aliases) {
      const index = findAlias(text, lowerText, candidate.term, cursor);
      if (index === -1) continue;
      if (!bestMatch || index < bestMatch.index || (index === bestMatch.index && candidate.term.length > bestMatch.term.length)) {
        bestMatch = { ...candidate, index };
      }
    }

    if (!bestMatch) {
      parts.push({ type: 'text', text: text.slice(cursor) });
      break;
    }

    if (bestMatch.index > cursor) parts.push({ type: 'text', text: text.slice(cursor, bestMatch.index) });
    const end = bestMatch.index + bestMatch.term.length;
    parts.push({ type: 'term', text: text.slice(bestMatch.index, end), entry: bestMatch.entry });
    cursor = end;
  }

  return parts;
}
