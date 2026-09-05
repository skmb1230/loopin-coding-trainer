import { glossaryEntries } from './glossary.js';
import { workplaceTerms } from './workplaceTerms.js';

const knownAliases = new Set(glossaryEntries.flatMap((entry) => entry.terms.map((term) => term.toLowerCase())));
const extraEntries = workplaceTerms.flatMap((entry) => {
  const terms = [...new Set([entry.term, entry.english, ...entry.aliases])].filter((term) => {
    const alias = term.toLowerCase();
    if (knownAliases.has(alias)) return false;
    knownAliases.add(alias);
    return true;
  });
  return terms.length ? [{ id: entry.id, label: entry.term, terms, definition: `${entry.meaning} ${entry.distinction}` }] : [];
});

export const workplaceGlossaryEntries = [...glossaryEntries, ...extraEntries];
