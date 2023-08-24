import {Format} from 'type/serialization';

export const exported: Format = {
  projectSpec: {
    categories: [
      {
        name: 'Label',
        multiple: false,
        entries: [
          {
            name: 'construction',
            subentries: [
              {name: 'bridge'},
              {name: 'wall'},
              {name: 'shop', subentries: [{name: 'coffee shop'}, {name: 'toy shop'}]},
            ],
          },
          {name: 'vehicle', subentries: [{name: 'bicycle'}, {name: 'bus'}, {name: 'car'}]},
        ],
      },
      {
        name: 'Attribute',
        multiple: true,
        slicewise: true,
        entries: [{name: 'crowd'}, {name: 'occluded'}, {name: 'truncated'}, {name: 'unclear'}],
      },
    ],
  },
  annotations: [
    {
      resource: {
        type: 'video',
        name: 'Video1',
        frameUrls: ['https://test/frame-000001.jpg', 'https://test/frame-000002.jpg', 'https://test/frame-000003.jpg'],
      },
      annotation: {
        entities: [
          {
            sliceCategories: {'0': {Attribute: ['crowd', 'occluded']}, '1': {Attribute: ['unclear', 'truncated']}},
            globalCategories: {Label: ['bicycle']},
            sliceComponents: {
              '0': {
                polychains: [
                  {
                    closed: true,
                    vertices: [
                      [[433.43565525383707, 175.11216056670602]],
                      [[342.4793388429752, 370.62573789846516]],
                      [[558.3943329397874, 316.2219598583235]],
                    ],
                  },
                  {
                    closed: true,
                    vertices: [
                      [
                        [742.0070838252657, 161.5112160566706],
                        [856.5525383707203, 188.50059031877214],
                        [754.1204250295159, 212.72727272727272],
                      ],
                      [
                        [694.4037780401417, 306.87131050767414],
                        [693.7662337662338, 185.9504132231405],
                        [742.6446280991736, 282.4321133412043],
                      ],
                      [
                        [868.6658795749705, 239.71664698937425],
                        [754.7579693034238, 333.64817001180637],
                        [808.3116883116884, 212.939787485242],
                      ],
                    ],
                  },
                ],
              },
              '1': {
                polychains: [
                  {
                    closed: false,
                    vertices: [
                      [[315.2774498229044, 445.43093270365995]],
                      [[375.63164108618656, 272.01889020070837]],
                      [[525.2420306965762, 280.5194805194805]],
                      [[570.2951593860685, 158.11097992916174]],
                    ],
                  },
                  {
                    closed: false,
                    vertices: [
                      [[784.5100354191263, 478.5832349468713]],
                      [
                        [812.5619834710744, 362.97520661157023],
                        [820.4250295159386, 456.6942148760331],
                        [776.6469893742621, 384.86422668240846],
                      ],
                      [[938.3707201889019, 391.8772136953955]],
                      [
                        [1014.025974025974, 172.56198347107437],
                        [1012.1133412042502, 355.96221959858326],
                        [940.2833530106258, 208.47697756788662],
                      ],
                    ],
                  },
                ],
              },
            },
          },
          {
            globalCategories: {Label: ['bus']},
            sliceComponents: {
              '1': {
                rectangles: [
                  [
                    [513.3412042502952, 453.9315230224321],
                    [714.8051948051948, 586.5407319952774],
                  ],
                ],
              },
            },
          },
          {
            globalCategories: {Label: ['coffee shop']},
            sliceComponents: {
              '2': {
                masks: [
                  {
                    offset: [412.19952774498233, 337.0495867768595],
                    rle: {
                      size: [456, 149],
                      cocoCounts:
                        'Q5Y2n;3L4L4N1Ng1YN8G:G3M4L6J4K4L6K2N3L4N3L3M3M2N3M3M3Mg1YN7I5K5K2M4M5K2M4N2L3O2M3M2M3N3N2M2O0O3M101N2N2O1N1O3N001M2N3M3N2L3M4N1L5M3L3M4L3N2M3N2N2O1M3M3L4M3L4K5J6K5K5L4J6I7K5K5L]`c0f2\\\\\\Oe0oNQ1@`0@`0\\Od0]Oc0E;I7H8H8H8C=^Ob0_Na1B>B>E;K5L4K5',
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    },
    {
      resource: {
        type: 'video',
        name: 'Video2',
        frameUrls: ['https://test/frame-000004.jpg', 'https://test/frame-000005.jpg', 'https://test/frame-000006.jpg'],
      },
      annotation: {
        entities: [
          {
            sliceCategories: {'0': {Attribute: ['truncated', 'unclear']}, '1': {Attribute: ['truncated']}},
            globalCategories: {Label: ['wall']},
            sliceComponents: {
              '0': {
                polychains: [
                  {
                    closed: true,
                    vertices: [
                      [[935.8205430932703, 340.8736717827627]],
                      [[791.310507674144, 388.47697756788665]],
                      [[838.0637544273908, 464.98229043683585]],
                      [[997.874852420307, 455.6316410861865]],
                      [
                        [1025.0767414403779, 377.4262101534829],
                        [1024.2266824085004, 442.8807556080283],
                        [998.7249114521842, 390.17709563164107],
                      ],
                    ],
                  },
                ],
              },
              '1': {
                polychains: [
                  {
                    closed: false,
                    vertices: [
                      [[798.961038961039, 165.76151121605668]],
                      [
                        [680.8028335301062, 367.2255017709563],
                        [719.0554899645809, 186.5879574970484],
                        [760.7083825265644, 346.39905548996467],
                      ],
                      [[805.7615112160566, 409.72845336481697]],
                      [[777.7095631641087, 545.7378984651712]],
                    ],
                  },
                ],
              },
              '2': {
                rectangles: [
                  [
                    [704.6044864226683, 252.46753246753246],
                    [1053.1286894923257, 493.88429752066116],
                  ],
                ],
              },
            },
          },
          {
            sliceComponents: {
              '0': {
                masks: [
                  {offset: [486, 420], rle: {size: [32, 32], cocoCounts: '0PP1'}},
                  {offset: [698, 426], rle: {size: [32, 32], cocoCounts: '0PP1'}},
                  {offset: [500, 518], rle: {size: [32, 32], cocoCounts: '0PP1'}},
                  {offset: [816, 552], rle: {size: [32, 32], cocoCounts: '0PP1'}},
                  {offset: [613, 623], rle: {size: [32, 32], cocoCounts: '0PP1'}},
                ],
              },
              '1': {
                masks: [
                  {offset: [374, 353], rle: {size: [32, 32], cocoCounts: '0PP1'}},
                  {offset: [260, 446], rle: {size: [32, 32], cocoCounts: '0PP1'}},
                  {offset: [463, 494], rle: {size: [32, 32], cocoCounts: '0PP1'}},
                  {offset: [272, 535], rle: {size: [32, 32], cocoCounts: '0PP1'}},
                  {offset: [496, 543], rle: {size: [32, 32], cocoCounts: '0PP1'}},
                ],
              },
              '2': {
                masks: [
                  {offset: [342, 354], rle: {size: [32, 32], cocoCounts: '0PP1'}},
                  {offset: [499, 431], rle: {size: [32, 32], cocoCounts: '0PP1'}},
                  {offset: [555, 454], rle: {size: [32, 32], cocoCounts: '0PP1'}},
                  {offset: [198, 501], rle: {size: [32, 32], cocoCounts: '0PP1'}},
                  {offset: [499, 505], rle: {size: [32, 32], cocoCounts: '0PP1'}},
                  {offset: [354, 585], rle: {size: [32, 32], cocoCounts: '0PP1'}},
                ],
              },
            },
          },
        ],
      },
    },
  ],
};
