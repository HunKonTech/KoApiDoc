import Resolver from '@forge/resolver';

// No backend logic: the spec lives in the macro config or in a page attachment
// that the UI reads with requestConfluence (as the viewing user). The resolver
// is kept so later steps (e.g. URL loading) have a place to add definitions.
const resolver = new Resolver();

export const handler = resolver.getDefinitions();
