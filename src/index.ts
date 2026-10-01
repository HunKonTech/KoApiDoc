import Resolver from '@forge/resolver';

// Step 1 has no backend logic: the spec lives in the macro config and is
// rendered client side. The resolver is kept so later steps (attachments,
// URL loading) have a place to add definitions.
const resolver = new Resolver();

export const handler = resolver.getDefinitions();
