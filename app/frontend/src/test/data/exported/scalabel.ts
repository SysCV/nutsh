import {Format} from 'type/scalabel';

export const exported: Format = {
  frames: [
    {
      name: 'Video0001:0',
      url: 'https://test/frame-000001.jpg',
      videoName: 'Video0001',
      labels: [
        {
          id: '86634337-6a12-44df-8737-bbad8c966d26',
          attributes: {crowd: true, occluded: true},
          category: 'parking',
          poly2d: [
            {
              vertices: [
                [311.8772136953955, 197.6387249114522],
                [154.61629279811098, 243.5419126328217],
                [131.66469893742624, 164.91145218417944],
                [182.66824085005902, 155.9858323494687],
                [164.8170011806376, 53.97874852420307],
                [215.82054309327037, 45.053128689492326],
                [251.52302243211338, 75.23022432113342],
                [311.87721369539554, 3.8252656434474517],
                [347.5796930342385, 34.002361275088546],
                [345.24203069657614, 82.66824085005902],
                [442.5737898465172, 87.34356552538371],
                [440.2361275088548, 136.00944510035418],
                [378.81936245572615, 144.72255017709563],
                [396.245572609209, 267.556080283353],
                [334.8288075560803, 276.26918536009447],
              ],
              types: 'CCLCCLCCLCCLCCL',
              closed: true,
            },
            {
              vertices: [
                [552.443919716647, 204.01416765053128],
                [549.8937426210153, 109.65761511216056],
                [640, 20.401416765053128],
                [793.0106257378984, 105.4073199527745],
                [713.1050767414404, 191.26328217237307],
              ],
              types: 'LLLLL',
              closed: true,
            },
            {
              vertices: [
                [867.8158205430933, 295.8205430932704],
                [877.1664698937426, 164.06139315230223],
              ],
              types: 'LL',
              closed: false,
            },
            {
              vertices: [
                [993.6245572609209, 265.21841794569065],
                [991.9244391971664, 142.8099173553719],
                [1073.530106257379, 59.50413223140496],
              ],
              types: 'LLL',
              closed: false,
            },
            {
              vertices: [
                [163.11688311688314, 566.9893742621015],
                [193.93152302243212, 532.7744982290436],
                [125.50177095631645, 471.14521841794567],
                [156.31641086186542, 436.9303423848878],
                [157.16646989374263, 402.07792207792204],
                [196.69421487603307, 354.0495867768595],
                [237.92207792207793, 353.6245572609209],
                [271.07438016528926, 345.12396694214874],
                [320.8028335301062, 332.37308146399056],
                [345.87957497048404, 361.2750885478158],
              ],
              types: 'LCCLCCLCCL',
              closed: false,
            },
          ],
          box2d: [{x1: 424.93506493506493, y1: 340.8736717827627, x2: 617.0484061393153, y2: 515.9858323494688}],
        },
        {
          id: '058f7608-31c6-4389-965f-82ee7499dee2',
          attributes: {truncated: true, unclear: true},
          category: 'bridge',
          poly2d: [
            {
              vertices: [
                [778.5596221959859, 578.0401416765053],
                [776.0094451003542, 409.72845336481697],
                [872.9161747343566, 385.0767414403778],
                [957.922077922078, 497.28453364817],
              ],
              types: 'LLLL',
              closed: true,
            },
          ],
        },
      ],
    },
    {
      name: 'Video0001:1',
      url: 'https://test/frame-000002.jpg',
      videoName: 'Video0001',
      labels: [
        {
          id: '86634337-6a12-44df-8737-bbad8c966d26',
          attributes: {occluded: true, truncated: true, unclear: true},
          category: 'parking',
          poly2d: [
            {
              vertices: [
                [173.3175914994097, 223.56552538370718],
                [173.3175914994097, 107.10743801652892],
                [301.676505312869, 75.65525383707201],
                [350.12987012987014, 173.41204250295158],
                [351.82998819362456, 266.9185360094451],
                [243.0224321133412, 287.31995277449823],
              ],
              types: 'LLLLLL',
              closed: true,
            },
            {
              vertices: [
                [880.5667060212514, 363.82526564344744],
                [897.5678866587957, 224.41558441558442],
                [1027.6269185360095, 170.86186540731995],
                [1076.0802833530106, 105.4073199527745],
              ],
              types: 'LLLL',
              closed: false,
            },
          ],
        },
        {
          id: '058f7608-31c6-4389-965f-82ee7499dee2',
          attributes: {unclear: true},
          category: 'bridge',
          box2d: [{x1: 514.1912632821724, y1: 266.06847697756785, x2: 721.6056670602126, y2: 419.0791027154663}],
        },
      ],
    },
    {
      name: 'Video0001:2',
      url: 'https://test/frame-000003.jpg',
      videoName: 'Video0001',
      labels: [
        {
          id: '058f7608-31c6-4389-965f-82ee7499dee2',
          attributes: {truncated: true, unclear: true},
          category: 'bridge',
          poly2d: [
            {
              vertices: [
                [571.1452184179457, 467.53246753246754],
                [610.2479338842975, 300.0708382526564],
                [737.7567886658795, 266.06847697756785],
                [820.2125147579693, 157.26092089728454],
                [918.819362455726, 196.36363636363635],
              ],
              types: 'LLLLL',
              closed: false,
            },
          ],
        },
        {
          id: '02136b38-192d-4e3b-92cd-53919ecb14c5',
          category: 'garage',
          box2d: [{x1: 169.06729634002363, y1: 153.86068476977567, x2: 323.7780401416765, y2: 245.66706021251474}],
        },
      ],
    },
    {
      name: 'Video0002:0',
      url: 'https://test/frame-000004.jpg',
      videoName: 'Video0002',
      labels: [
        {
          id: 'ed8e7263-d89d-4fad-9c27-76b8d03332f9',
          poly2d: [
            {
              vertices: [
                [141.8654073199528, 376.5761511216057],
                [67.06021251475799, 204.86422668240849],
                [207.31995277449823, 103.70720188902007],
                [416.4344746162928, 119.85832349468713],
                [446.1865407319953, 255.0177095631641],
                [346.7296340023613, 386.77685950413223],
              ],
              types: 'LLLLLL',
              closed: true,
            },
          ],
        },
      ],
    },
    {
      name: 'Video0002:1',
      url: 'https://test/frame-000005.jpg',
      videoName: 'Video0002',
      labels: [
        {
          id: 'cca1bcc2-89d3-43b2-92bf-5750aa8122eb',
          box2d: [{x1: 138.46517119244393, y1: 119.00826446280992, x2: 555.8441558441558, y2: 397.827626918536}],
        },
      ],
    },
    {
      name: 'Video0002:2',
      url: 'https://test/frame-000006.jpg',
      videoName: 'Video0002',
      labels: [
        {
          id: 'c6ed211c-cd51-47d8-a99d-65fcb56b5e12',
          poly2d: [
            {
              vertices: [
                [280.4250295159386, 521.086186540732],
                [422.3848878394333, 200.61393152302242],
                [659.5513577331759, 385.926800472255],
                [864.4155844155844, 194.66351829988193],
                [1014.8760330578513, 309.42148760330576],
                [981.7237308146399, 481.1334120425029],
              ],
              types: 'LLLLLL',
              closed: false,
            },
          ],
        },
      ],
    },
  ],
  config: {
    attributes: [{name: 'crowd'}, {name: 'occluded'}, {name: 'truncated'}, {name: 'unclear'}],
    categories: [
      {
        name: 'void',
        subcategories: [
          {name: 'unlabeled'},
          {name: 'dynamic'},
          {name: 'ego vehicle'},
          {name: 'ground'},
          {name: 'static'},
        ],
      },
      {name: 'flat', subcategories: [{name: 'parking'}, {name: 'rail track'}, {name: 'road'}, {name: 'sidewalk'}]},
      {
        name: 'construction',
        subcategories: [
          {name: 'bridge'},
          {name: 'building'},
          {name: 'bus stop'},
          {name: 'fence'},
          {name: 'garage'},
          {name: 'guard rail'},
          {name: 'tunnel'},
          {name: 'wall'},
        ],
      },
      {
        name: 'object',
        subcategories: [
          {name: 'banner'},
          {name: 'billboard'},
          {name: 'fire hydrant'},
          {name: 'lane divider'},
          {name: 'mail box'},
          {name: 'parking sign'},
          {name: 'pole'},
          {name: 'street light'},
          {name: 'traffic cone'},
          {name: 'traffic device'},
          {name: 'traffic light'},
          {name: 'traffic sign'},
          {name: 'traffic sign frame'},
          {name: 'trash can'},
        ],
      },
      {name: 'nature', subcategories: [{name: 'terrain'}, {name: 'vegetation'}]},
      {name: 'sky', subcategories: [{name: 'sky'}]},
      {name: 'human', subcategories: [{name: 'person'}, {name: 'rider'}]},
      {
        name: 'vehicle',
        subcategories: [
          {name: 'bicycle'},
          {name: 'bus'},
          {name: 'car'},
          {name: 'caravan'},
          {name: 'motorcycle'},
          {name: 'trailer'},
          {name: 'train'},
          {name: 'truck'},
        ],
      },
    ],
  },
};
