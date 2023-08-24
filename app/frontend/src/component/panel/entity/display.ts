import type {EntityId} from 'type/annotation';

/**
 * A global lookup table to provide human-readable ids for entities.
 * Do note that same entity may have different displayId across different renderings.
 */
export class EntityDisplayId {
  static lookup = new Map<EntityId, number>();
  static next = 1;

  static get(eid: EntityId): number {
    const id = this.lookup.get(eid);
    if (id) {
      return id;
    }
    const newId = this.next;
    this.next++;
    this.lookup.set(eid, newId);
    return newId;
  }
}

/**
 * A global lookup table to provide colors.
 */
export class ColorPalette {
  private static dict = new Map<string /* id */, number /* index */>();
  private static reverse = new Map<number /* index */, string /* id */>();

  // The tolerance size.
  private static d = 2;

  // N^3 possible colours in total.
  private static N = Math.floor(256 / (2 * this.d + 1));

  // Some starting position.
  private static idx = 6003;

  // Some prime number within [0, N^3).
  private static p = 81973;

  static get(id: string): [number, number, number] {
    const index = this.dict.get(id);
    return index ? this.indexToColor(index) : this.advance(id);
  }

  static advance(id: string): [number, number, number] {
    const idx = this.idx;
    this.idx = (this.idx + this.p) % this.N ** 3;

    console.assert(!this.reverse.has(idx), `duplicated index ${idx}`);
    this.dict.set(id, idx);
    this.reverse.set(idx, id);
    return this.indexToColor(idx);
  }

  static current(): [number, number, number] {
    return this.indexToColor(this.idx);
  }

  static lookup(rgb: [number, number, number]): string | undefined {
    const idx = this.colorToIndex(rgb);
    return this.reverse.get(idx);
  }

  private static indexToColor(index: number): [number, number, number] {
    const [a, d] = [2 * this.d + 1, this.d];
    const [i, j, k] = [Math.floor(index / this.N ** 2), Math.floor((index % this.N ** 2) / this.N), index % this.N];
    return [a * i + d, a * j + d, a * k + d];
  }

  private static colorToIndex(rgb: [number, number, number]): number {
    const [r, g, b] = rgb;
    const a = 2 * this.d + 1;
    const [i, j, k] = [Math.floor(r / a), Math.floor(g / a), Math.floor(b / a)];
    return i * this.N ** 2 + j * this.N + k;
  }
}

// Copied and modified from https://www.geeksforgeeks.org/find-shortest-unique-prefix-every-word-given-list-set-2-using-sorting/
// A better implementation using Trie can be found at https://www.geeksforgeeks.org/find-all-shortest-unique-prefixes-to-represent-each-word-in-a-given-list/
// but no Javascript/Typescript version is provided.
// WARN(hxu): the input `texts` must be sorted.
// WARN(hxu): must hold that no word is prefix of another.
function findShortestUniquePrefixs(texts: string[]): string[] {
  const size = texts.length;
  if (size === 0) {
    return [];
  }
  if (size === 1) {
    return [texts[0][0]];
  }

  const res = new Array(size);

  let j = 0;
  while (j < Math.min(texts[0].length - 1, texts[1].length - 1)) {
    if (texts[0].charAt(j) === texts[1].charAt(j)) {
      j++;
    } else {
      break;
    }
  }

  let ind = 0;
  res[ind++] = texts[0].substring(0, j + 1);

  let tempPrefix = texts[1].substring(0, j + 1);
  for (let i = 1; i < size - 1; i++) {
    j = 0;
    while (j < Math.min(texts[i].length - 1, texts[i + 1].length - 1)) {
      if (texts[i].charAt(j) === texts[i + 1].charAt(j)) {
        j++;
      } else {
        break;
      }
    }

    const newPrefix = texts[i].substring(0, j + 1);

    if (tempPrefix.length > newPrefix.length) {
      res[ind++] = tempPrefix;
    } else {
      res[ind++] = newPrefix;
    }

    tempPrefix = texts[i + 1].substring(0, j + 1);
  }

  j = 0;
  const secLast = texts[size - 2];
  const last = texts[size - 1];

  while (j < Math.min(secLast.length - 1, last.length - 1)) {
    if (secLast.charAt(j) === last.charAt(j)) {
      j++;
    } else {
      break;
    }
  }

  res[ind] = last.substring(0, j + 1);
  return res;
}

/**
 * A global lookup table to provide abbreviation for category values.
 */
export class CategoryAbbreviation {
  static lookup = new Map<string /* value */, string /* abbr */>();

  static set(values: string[]) {
    this.lookup.clear();

    values.sort();

    const abbrs = findShortestUniquePrefixs(
      // The shortest unique prefix algorithm requires that no word can be
      // prefix of another. However, in practice there may be values like
      // `parking` and `parking lot`. To rescue, an impossible character `@` is
      // manually appended to each value.
      values.map(v => this.normalize(v) + '@')
    );
    values.forEach((v, i) => this.lookup.set(this.normalize(v), abbrs[i]));
  }

  static get(value: string): string {
    return this.lookup.get(this.normalize(value)) ?? value;
  }

  private static normalize(value: string): string {
    return value.replaceAll(' ', '');
  }
}
