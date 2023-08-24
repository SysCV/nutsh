import {rleCountsFromStringCOCO, rleCountsToStringCOCO, shrink, expand} from 'common/algorithm/rle';

describe('rle', () => {
  test('COCO rle counts to string ', () => {
    (
      [
        [[0, 6, 1, 3], '061M'],
        [[0, 6, 1], '061'],
        [[0, 6, 1, 1], '061K'],
        [[0, 6, 1, 5], '061O'],
        [[0, 6, 1, 6], '0610'],
        [[0, 1, 1, 2, 1, 3, 1, 4, 1], '011101010'],
        [[0, 1024], '0PP1'],
      ] as [number[], string][]
    ).forEach(([counts, str]) => {
      expect(rleCountsToStringCOCO(counts)).toStrictEqual(str);
      expect(rleCountsFromStringCOCO(str)).toStrictEqual(counts);
    });
  });

  test('shrink and expand ', () => {
    [
      {
        rle: {counts: [0, 3, 5, 3, 5, 3, 45], size: {width: 8, height: 8}},
        expected: {rle: {counts: [0, 9], size: {width: 3, height: 3}}, offset: {x: 0, y: 0}},
      },
      {
        rle: {counts: [2, 3, 5, 3, 5, 3, 43], size: {width: 8, height: 8}},
        expected: {rle: {counts: [0, 9], size: {width: 3, height: 3}}, offset: {x: 0, y: 2}},
      },
      {
        rle: {counts: [5, 3, 5, 3, 5, 3, 40], size: {width: 8, height: 8}},
        expected: {rle: {counts: [0, 9], size: {width: 3, height: 3}}, offset: {x: 0, y: 5}},
      },
      {
        rle: {counts: [16, 3, 5, 3, 5, 3, 29], size: {width: 8, height: 8}},
        expected: {rle: {counts: [0, 9], size: {width: 3, height: 3}}, offset: {x: 2, y: 0}},
      },
      {
        rle: {counts: [18, 3, 5, 3, 5, 3, 27], size: {width: 8, height: 8}},
        expected: {rle: {counts: [0, 9], size: {width: 3, height: 3}}, offset: {x: 2, y: 2}},
      },
      {
        rle: {counts: [21, 3, 5, 3, 5, 3, 24], size: {width: 8, height: 8}},
        expected: {rle: {counts: [0, 9], size: {width: 3, height: 3}}, offset: {x: 2, y: 5}},
      },
      {
        rle: {counts: [40, 3, 5, 3, 5, 3, 5], size: {width: 8, height: 8}},
        expected: {rle: {counts: [0, 9], size: {width: 3, height: 3}}, offset: {x: 5, y: 0}},
      },
      {
        rle: {counts: [42, 3, 5, 3, 5, 3, 3], size: {width: 8, height: 8}},
        expected: {rle: {counts: [0, 9], size: {width: 3, height: 3}}, offset: {x: 5, y: 2}},
      },
      {
        rle: {counts: [45, 3, 5, 3, 5, 3], size: {width: 8, height: 8}},
        expected: {rle: {counts: [0, 9], size: {width: 3, height: 3}}, offset: {x: 5, y: 5}},
      },
      {
        rle: {counts: [18, 1, 1, 1, 6, 1, 6, 1, 1, 1, 27], size: {width: 8, height: 8}},
        expected: {rle: {counts: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1], size: {width: 3, height: 3}}, offset: {x: 2, y: 2}},
      },
      {
        rle: {counts: [19, 1, 6, 1, 1, 1, 6, 1, 28], size: {width: 8, height: 8}},
        expected: {rle: {counts: [1, 1, 1, 1, 1, 1, 1, 1, 1], size: {width: 3, height: 3}}, offset: {x: 2, y: 2}},
      },
      {
        rle: {counts: [0, 1, 1, 1, 6, 1, 6, 1, 1, 1, 45], size: {width: 8, height: 8}},
        expected: {rle: {counts: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1], size: {width: 3, height: 3}}, offset: {x: 0, y: 0}},
      },
      {
        rle: {counts: [1, 1, 6, 1, 1, 1, 6, 1, 46], size: {width: 8, height: 8}},
        expected: {rle: {counts: [1, 1, 1, 1, 1, 1, 1, 1, 1], size: {width: 3, height: 3}}, offset: {x: 0, y: 0}},
      },
      {
        rle: {counts: [28, 1, 35], size: {width: 8, height: 8}},
        expected: {rle: {counts: [0, 1], size: {width: 1, height: 1}}, offset: {x: 3, y: 4}},
      },
      {
        rle: {counts: [0, 1, 62, 1], size: {width: 8, height: 8}},
        expected: {rle: {counts: [0, 1, 62, 1], size: {width: 8, height: 8}}, offset: {x: 0, y: 0}},
      },
      {
        rle: {counts: [0, 64], size: {width: 8, height: 8}},
        expected: {rle: {counts: [0, 64], size: {width: 8, height: 8}}, offset: {x: 0, y: 0}},
      },
      {
        rle: {counts: [16, 1, 6, 1, 3, 1, 12], size: {width: 8, height: 5}},
        expected: {rle: {counts: [0, 1, 4, 1, 1, 1, 1], size: {width: 3, height: 3}}, offset: {x: 3, y: 1}},
      },
    ].forEach(({rle, expected}) => {
      const shrinked = shrink(rle);
      expect(shrinked).toStrictEqual<typeof shrinked>(expected);

      const expanded = expand(expected.rle, rle.size, expected.offset);
      expect(expanded).toStrictEqual<typeof expanded>(rle);
    });
  });
});
