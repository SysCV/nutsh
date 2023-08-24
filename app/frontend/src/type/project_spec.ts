import * as t from 'io-ts';
import {mustDecodeJsonStr as _mustDecodeJsonStr} from './common';

export type ProjectSpec = t.TypeOf<typeof IProjectSpec>;
export type Category = t.TypeOf<typeof ICategory>;
export type Entry = {
  name: string;
  subentries?: Entry[];
};

export function mustDecodeJsonStr(str: string): ProjectSpec {
  return _mustDecodeJsonStr(IProjectSpec, str);
}

const IEntry: t.Type<Entry> = t.recursion('IEntry', () =>
  t.intersection([
    t.type({
      name: t.string,
    }),
    t.partial({
      subentries: t.array(IEntry),
    }),
  ])
);

/**
 * Each Entity of the Project can bears one or more Entries from each Category.
 * The leaf Entry of each Category must have unique name.
 */
const ICategory = t.intersection([
  t.type({
    name: t.string,
    entries: t.array(IEntry),
  }),
  t.partial({
    multiple: t.boolean,
    slicewise: t.boolean,
  }),
]);

export const IProjectSpec = t.partial({
  categories: t.array(ICategory),
});
