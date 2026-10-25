/* Every building on the Chicago River architecture tour skyline.
 *
 * tier 1 = Rookie (the superstars), 2 = Pro, 3 = Legend.
 * clues never say the building's name – they power the "Clue Detective" questions.
 * photo (optional): put a picture at public/img/buildings/<id>.jpg and set photo: true
 * to show the real photo instead of the illustration.
 *
 * Every drawing uses a 200 x 300 box with the ground at y = 285. */
(function (root) {
  const GOLD = '#e2b84a';

  const BUILDINGS = [
    {
      id: 'lakepoint', noShadow: true, name: 'Lake Point Tower', tier: 2, year: 1968, height: 645, floors: 70,
      architect: 'Schipporeit & Heinrich',       spot: 'Find the dark, curvy, three-lobed tower all by itself out by the lake.',
      facts: [
        "It's the only skyscraper east of Lake Shore Drive – a city rule keeps the lakefront open.",
        'When it opened it was the tallest apartment building in the world.',
        'Seen from above, it has three curvy arms like a giant propeller.',
      ],
      clues: [
        "I'm a dark, curvy glass tower standing all alone by the shore.",
        'From above I look like a three-leaf clover or a propeller.',
      ],
      draw(d) {
        const lobe = () => d.lg([[0, '#2b231f'], [0.45, '#8c7867'], [0.6, '#a28b77'], [1, '#2b231f']]);
        let s = d.R(40, 268, 120, 17, '#5fa35a');
        [[48, 86], [116, 154]].forEach(([a, b]) => {
          s += d.R(a, 70, b - a, 200, lobe(), 'rx="14"');
        });
        s += d.R(80, 66, 40, 204, lobe(), 'rx="16"');
        s += d.H(48, 78, 106, 190, 4, 0.7, 'rgba(255,220,170,.35)');
        s += d.R(46, 58, 110, 16, '#1f1915', 'rx="7"');
        s += d.R(52, 62, 98, 4, '#b39a7c', 'rx="2"');
        return s;
      },
    },
    {
      id: 'aqua', name: 'Aqua Tower', tier: 1, year: 2009, height: 859, floors: 82,
      architect: 'Jeanne Gang (Studio Gang)',       spot: 'Look for white balconies that ripple up the tower like waves on water.',
      facts: [
        'Its wavy concrete balconies are all different shapes – no two floors are the same.',
        'The waves help break up strong wind and shade the windows from the sun.',
        'Architect Jeanne Gang designed it, and later designed the St. Regis tower too.',
      ],
      clues: [
        'My white balconies ripple like waves on a pond.',
        "If water were a skyscraper, it'd look like me!",
      ],
      draw(d) {
        let s = d.W(66, 36, 68, 249, '#2d7fb4', { cw: 6, rh: 5, ww: 4.5, wh: 3, c: '#78c0e8' });
        for (let y = 38; y < 283; y += 4.2) {
          const l = Math.max(0, 5 + 6 * Math.sin(y / 15) + 3 * Math.sin(y / 5.7));
          const r = Math.max(0, 5 + 6 * Math.cos(y / 13) + 3 * Math.sin(y / 4.3 + 1));
          s += d.R(66 - l, y, 68 + l + r, 1.6, '#fbfbf7', 'rx=".8"');
          const pool = Math.sin(y / 9) > 0.55;
          if (pool) s += d.R(80 + 10 * Math.sin(y / 20), y + 0.2, 26, 1.2, '#2d7fb4');
        }
        return s;
      },
    },
    {
      id: 'stregis', name: 'St. Regis Chicago', aka: 'Vista Tower', tier: 1, year: 2020, height: 1191, floors: 101,
      architect: 'Jeanne Gang (Studio Gang)',       spot: 'Three blue-green glass towers of different heights, stacked like wobbly blocks.',
      facts: [
        "It's the 3rd-tallest building in Chicago.",
        "It's the tallest building in the world designed by a woman-led architecture firm.",
        'Near the top is an open-air floor that lets wind blow right through the building!',
      ],
      clues: [
        "I'm three glass towers holding hands – short, tall, and medium.",
        'My glass changes from blue to green, and wind can blow through a hole near my top.',
      ],
      draw(d) {
        let s = '';
        const col = (cx, top, w, n) => {
          const seg = (285 - top) / n;
          let out = '';
          for (let i = 0; i < n; i++) {
            const y0 = top + i * seg, y1 = y0 + seg;
            const narrowTop = i % 2 === 0;
            const wt = narrowTop ? w * 0.8 : w, wb = narrowTop ? w : w * 0.8;
            const g = d.lg(i % 2 ? [[0, '#2e7c8f'], [0.5, '#8fd6dc'], [1, '#2e6d8f']] : [[0, '#2d5f86'], [0.5, '#7cc0e0'], [1, '#2b5a7d']]);
            out += d.P(`${cx - wt / 2},${y0} ${cx + wt / 2},${y0} ${cx + wb / 2},${y1} ${cx - wb / 2},${y1}`, g);
          }
          out += d.H(cx - w / 2, top, w, 285 - top, 3.5, 0.6, 'rgba(255,255,255,.25)');
          return out;
        };
        s += col(70, 96, 34, 4) + col(132, 62, 34, 5) + col(101, 26, 38, 6);
        s += d.R(84, 44, 34, 5, '#cbeefc') + d.V(84, 44, 34, 5, 6, 1.4, '#2b5a7d');
        return s;
      },
    },
    {
      id: 'nbc', name: 'NBC Tower', tier: 2, year: 1989, height: 627, floors: 40,
      architect: 'Adrian Smith (SOM)',       spot: 'A cream-colored stone tower that steps in like a wedding cake, topped by a needle.',
      facts: [
        'It was built in 1989 but designed to look like a 1930s Art Deco skyscraper.',
        "Its design was inspired by 30 Rockefeller Plaza in New York City, NBC's famous home.",
        "It's home to NBC's Chicago TV station.",
      ],
      clues: [
        "I look old-fashioned, but I'm one of the younger towers – I'm a new building in a 1930s costume.",
        "I'm made of cream stone and step in like a wedding cake with a needle on top.",
      ],
      draw(d) {
        const st = '#ece2cb', o = { cw: 6, rh: 7, ww: 2.6, wh: 5, c: '#7d8792' };
        let s = d.P('98.5,60 100,10 101.5,60', '#cfc3a6');
        s += d.W(88, 58, 24, 26, st, o) + d.W(78, 82, 44, 38, st, o) + d.W(68, 118, 64, 44, st, o) + d.W(58, 160, 84, 125, st, o);
        s += d.R(58, 160, 8, 125, 'rgba(0,0,0,.08)') + d.R(134, 160, 8, 125, 'rgba(0,0,0,.08)');
        s += d.R(92, 255, 16, 30, '#6b5c45', 'rx="2"');
        return s;
      },
    },
    {
      id: 'crain', name: 'Crain Communications Building', aka: 'Smurfit-Stone Building', tier: 2, year: 1984, height: 582, floors: 41,
      architect: 'A. Epstein & Sons', nickname: 'The Diamond',
      spot: 'Look for the white tower with a slanted top that makes a giant diamond shape.',
      facts: [
        'Its top is sliced off at a steep angle, which makes a diamond shape on its face.',
        'The diamond top glows with lights at night.',
        'Lots of people still call it the Smurfit-Stone Building, its old name.',
      ],
      clues: [
        'Somebody sliced my top off at an angle and it left a big diamond shape!',
        "I'm a white tower wearing a glass diamond on my head.",
      ],
      draw(d) {
        let s = d.R(66, 100, 68, 185, '#f3f2ee') + d.V(66, 100, 68, 185, 6, 3, '#7aa6c6');
        s += d.P('66,100 66,72 100,38 134,72 134,100', '#f3f2ee');
        s += d.P('100,44 128,73 100,102 72,73', d.lg([[0, '#3d78a6'], [0.5, '#bfe2f5'], [1, '#3d78a6']]));
        s += d.L(100, 44, 100, 102, 'rgba(255,255,255,.5)', 1) + d.L(72, 73, 128, 73, 'rgba(255,255,255,.5)', 1);
        return s;
      },
    },
    {
      id: 'aon', noShadow: true, name: 'Aon Center', aka: 'Standard Oil Building', tier: 1, year: 1973, height: 1136, floors: 83,
      architect: 'Edward Durell Stone', nickname: 'Big Stan',
      spot: 'A super-tall, plain white box covered in thin vertical stripes with a flat top.',
      facts: [
        'It was first covered in Italian marble – but the marble started cracking and falling, so it was replaced with granite!',
        "It's one of the tallest buildings in Chicago.",
        'It was first called the Standard Oil Building ("Big Stan").',
      ],
      clues: [
        "I'm a giant white box with pinstripes and a perfectly flat top.",
        'My first coat was Italian marble, but it kept falling off, so I got a new granite coat.',
      ],
      draw(d) {
        let s = d.R(70, 26, 60, 259, '#efeeea') + d.V(70, 26, 60, 259, 5, 2.2, '#99a3ad');
        s += d.R(70, 26, 4, 259, '#d4d3cd') + d.R(126, 26, 4, 259, '#d4d3cd');
        s += d.R(70, 26, 60, 4, '#dddcd6') + d.R(72, 272, 56, 13, '#4c545c');
        return s;
      },
    },
    {
      id: 'twopru', name: 'Two Prudential Plaza', tier: 2, year: 1990, height: 995, floors: 64,
      architect: 'Loebl Schlossman & Hackl',       spot: 'A gray tower with a pointy top made of stacked V-shapes and a sharp spire.',
      facts: [
        'Its pointy top is made of stacked chevrons (V-shapes) that step up to a spire.',
        'At 995 feet, it is just 5 feet short of 1,000!',
        'It stands right next to its older, shorter sibling, One Prudential Plaza.',
      ],
      clues: [
        "My head is a pointy stack of V-shapes like a sharpened pencil.",
        "I'm a gray tower with a pyramid of chevrons and a needle-sharp spire.",
      ],
      draw(d) {
        let s = d.P('99,36 100,6 101,36', '#9aa0a6');
        for (let k = 0; k < 5; k++) {
          const x0 = 72 + 5 * k, x1 = 128 - 5 * k, yb = 112 - 12 * k;
          s += d.P(`${x0},${yb} 100,${yb - 30} ${x1},${yb}`, k % 2 ? '#a7a29a' : '#cdc8bf');
        }
        s += d.W(72, 110, 56, 175, '#cdc8bf', { cw: 6, rh: 6, ww: 3.4, wh: 3.6, c: '#5f7488' });
        return s;
      },
    },
    {
      id: 'hancock', name: '875 North Michigan Avenue', aka: 'John Hancock Center', tier: 1, year: 1969, height: 1128, floors: 100,
      architect: 'Bruce Graham & Fazlur Khan (SOM)', nickname: 'Big John',
      spot: "Up Michigan Avenue: a black tower that gets skinnier at the top, with giant X's and two antennas.",
      facts: [
        "The giant X's on the outside are braces that make it super strong against wind.",
        'At the top, the TILT window tips you out over Michigan Avenue, 1,000 feet up!',
        'The same team that designed it went on to design the Willis Tower.',
      ],
      clues: [
        "I'm black, I get skinnier as I go up, and I'm covered in giant X's.",
        "I have two antennas, and visitors tilt out of my windows 1,000 feet up for fun!",
      ],
      draw(d) {
        let s = d.R(87, 8, 3, 50, '#ececec') + d.R(110, 8, 3, 50, '#ececec') + d.R(87, 8, 3, 4, '#e33') + d.R(110, 8, 3, 4, '#e33');
        const pts = '58,285 76,55 124,55 142,285';
        s += d.P(pts, '#2a2c31') + d.P(pts, d.pat(4, 4, 2.6, 2.4, '#4c5262'));
        const xl = (y) => 58 + (18 * (285 - y)) / 230, xr = (y) => 142 - (18 * (285 - y)) / 230;
        for (let i = 0; i < 5; i++) {
          const y0 = 62 + i * 44.6, y1 = y0 + 44.6;
          s += d.L(xl(y0), y0, xr(y1), y1, '#141518', 3) + d.L(xr(y0), y0, xl(y1), y1, '#141518', 3);
          s += d.L(xl(y1), y1, xr(y1), y1, '#141518', 2.2);
        }
        s += d.P('76,55 124,55 123.4,63 76.6,63', '#d9dadf');
        return s;
      },
    },
    {
      id: 'tribune', name: 'Tribune Tower', tier: 1, year: 1925, height: 462, floors: 36,
      architect: 'John Mead Howells & Raymond Hood',       spot: 'A cream stone tower with a crown of flying buttresses, like a castle or cathedral.',
      facts: [
        'Its design won a worldwide contest in 1922 with more than 260 entries.',
        'Pieces of famous places are built into its walls – like rocks from the Great Wall of China and the Taj Mahal!',
        'It was the home of the Chicago Tribune newspaper; now people live in it.',
      ],
      clues: [
        "I look like a castle! My crown has flying buttresses, like a cathedral.",
        'Bits of the Great Wall of China and other famous places are stuck in my walls.',
      ],
      draw(d) {
        const st = '#e5dabf';
        let s = d.W(68, 108, 64, 177, st, { cw: 8, rh: 10, ww: 3, wh: 8, c: '#787e86' });
        s += d.W(80, 56, 40, 54, st, { cw: 6.6, rh: 9, ww: 2, wh: 7, c: '#6e747b' });
        s += d.P('68,108 73,108 86,72 81,72', '#d6c9a8') + d.P('132,108 127,108 114,72 119,72', '#d6c9a8');
        s += d.P('82,110 86,110 92,74 89,74', '#d6c9a8') + d.P('118,110 114,110 108,74 111,74', '#d6c9a8');
        for (const x of [80, 89, 98, 107, 116]) s += d.P(`${x},56 ${x + 2},40 ${x + 4},56`, '#d6c9a8');
        s += d.R(78, 54, 44, 4, '#cbbd9a');
        s += d.R(66, 104, 68, 5, '#d0c3a1');
        s += d.D('M91 285 L91 266 Q100 248 109 266 L109 285 Z', '#5a4b38');
        return s;
      },
    },
    {
      id: 'wrigley', name: 'Wrigley Building', tier: 1, year: 1924, height: 425, floors: 30,
      architect: 'Graham, Anderson, Probst & White',       spot: 'A gleaming white building with a big clock tower right by the Michigan Avenue bridge.',
      facts: [
        'Its clock tower was inspired by the Giralda tower in Seville, Spain.',
        'Its white tiles come in different shades that get brighter toward the top.',
        'It was built for the Wrigley gum company – the same Wrigley as Wrigley Field!',
      ],
      clues: [
        "I'm bright white, I have a giant clock tower, and I glow at night.",
        'The chewing-gum family that named a baseball stadium built me.',
      ],
      draw(d) {
        const wt = '#f8f5ec', o = { cw: 7, rh: 8, ww: 3, wh: 5, c: '#61707f' };
        let s = d.W(152, 176, 38, 109, '#f1eee4', o) + d.W(26, 150, 128, 135, wt, o);
        s += d.R(26, 148, 128, 4, '#e3dfd2');
        s += d.W(78, 88, 44, 62, wt, o);
        s += d.C(100, 106, 11, '#fff', 'stroke="#2d2d2d" stroke-width="1.6"') + d.L(100, 106, 100, 99, '#222', 1.4) + d.L(100, 106, 105, 108, '#222', 1.4);
        s += d.R(82, 72, 36, 17, wt) + d.V(84, 74, 32, 12, 6, 2.5, '#9aa6b1');
        s += d.R(86, 56, 28, 17, '#f2efe5') + d.V(88, 58, 24, 12, 6, 2.5, '#9aa6b1');
        s += d.R(90, 44, 20, 13, wt);
        s += d.D('M90 44 Q100 22 110 44 Z', '#efe9da') + d.R(99.3, 12, 1.4, 16, '#bbb');
        return s;
      },
    },
    {
      id: 'london', name: 'London Guarantee Building', aka: 'LondonHouse', tier: 3, year: 1923, height: 300, floors: 21,
      architect: 'Alfred S. Alschuler',       spot: 'A white building with a little round temple and dome sitting on its roof.',
      facts: [
        'It stands on the spot where Fort Dearborn, the first U.S. fort in Chicago, was built in 1803.',
        'The round, columned cupola on top looks like a tiny Greek temple.',
        'Today it is a hotel with a rooftop deck right next to the dome.',
      ],
      clues: [
        "There's a little round temple with a dome sitting on my roof.",
        'I was built where Fort Dearborn, Chicago\'s very first fort, once stood.',
      ],
      draw(d) {
        const wt = '#f2eee3';
        let s = d.W(34, 132, 132, 153, wt, { cw: 7, rh: 8, ww: 3.2, wh: 5, c: '#69737e' });
        s += d.R(34, 132, 132, 20, '#e8e2d2') + d.V(36, 134, 128, 16, 6, 2.4, '#b6ad98');
        s += d.R(32, 128, 136, 5, '#ddd5c2');
        s += d.R(80, 92, 40, 38, wt) + d.V(82, 96, 36, 32, 5, 2.2, '#a69d8a');
        s += d.R(78, 88, 44, 5, '#ddd5c2');
        s += d.D('M80 88 Q100 52 120 88 Z', '#e4ddcc') + d.R(96, 60, 8, 8, wt) + d.R(99.4, 46, 1.2, 14, '#888') + d.P('100.6,46 110,49 100.6,52', '#d33');
        return s;
      },
    },
    {
      id: 'carbide', name: 'Carbide & Carbon Building', tier: 2, year: 1929, height: 503, floors: 37,
      architect: 'Burnham Brothers', nickname: 'The Champagne Bottle',
      spot: 'A dark green tower with shiny gold trim at the top, shaped a bit like a bottle.',
      facts: [
        'Legend says it was designed to look like a dark green champagne bottle with a gold foil top.',
        'The gold on top is real gold leaf!',
        "It was designed by the sons of Daniel Burnham, one of Chicago's most famous architects.",
      ],
      clues: [
        "I'm dark green and gold, and people say I look like a champagne bottle.",
        'My top is decorated with real gold leaf.',
      ],
      draw(d) {
        const gr = '#1f4e3c';
        let s = d.P('95,50 100,22 105,50', GOLD);
        s += d.R(90, 48, 20, 22, GOLD) + d.V(91, 50, 18, 18, 4, 1.4, '#9b7a22');
        s += d.R(84, 70, 32, 50, gr) + d.V(84, 70, 32, 50, 5, 1.2, GOLD);
        s += d.R(70, 118, 60, 134, gr) + d.W(70, 118, 60, 134, 'none', { cw: 6, rh: 7, ww: 3, wh: 4.5, c: '#13281f' }) + d.V(70, 118, 60, 134, 6, 0.9, '#c9a543');
        s += d.R(68, 116, 64, 4, GOLD);
        s += d.R(66, 250, 68, 35, '#17191b') + d.R(66, 250, 68, 2, GOLD);
        return s;
      },
    },
    {
      id: 'jewelers', name: '35 East Wacker', aka: 'Jewelers Building', tier: 3, year: 1926, height: 523, floors: 40,
      architect: 'Thielbar & Fugard', nickname: 'The Jewelers Building',
      spot: 'A fancy tan terra-cotta tower with a big round dome and four little domes on its corners.',
      facts: [
        'It had a car elevator! Jewelers drove right in and rode up to park safely next to their offices.',
        'Rumor says gangster Al Capone had a secret club up in the dome.',
        'It is covered in fancy terra-cotta decorations.',
      ],
      clues: [
        'I had a car elevator so people selling diamonds could park upstairs, safe from robbers.',
        'I wear a big dome on top with four tiny domes at my corners.',
      ],
      draw(d) {
        const tc = '#eadcbf';
        let s = d.W(64, 112, 72, 173, tc, { cw: 6, rh: 7, ww: 2.8, wh: 4.5, c: '#76736a' });
        for (const x of [70, 130]) s += d.R(x - 6, 104, 12, 10, tc) + d.D(`M${x - 6} 104 Q${x} 92 ${x + 6} 104 Z`, '#d9c79e');
        s += d.R(80, 80, 40, 32, tc) + d.V(82, 84, 36, 26, 5, 2.4, '#a8987a');
        s += d.R(78, 77, 44, 4, '#d8c8a4');
        s += d.D('M80 77 Q100 36 120 77 Z', '#dccb9f');
        s += d.R(96, 44, 8, 10, tc) + d.D('M95 44 Q100 34 105 44 Z', '#d9c79e');
        return s;
      },
    },
    {
      id: 'mather', name: 'Mather Tower', tier: 3, year: 1928, height: 521, floors: 42,
      architect: 'Herbert Hugh Riddle',       spot: 'A super skinny cream tower with an eight-sided pointy top, like a rocket.',
      facts: [
        "It's one of the skinniest skyscrapers in Chicago – the very top floors are tiny!",
        'The top is octagon-shaped (8 sides) and made of terra cotta.',
        'It was built for a company that made railroad cars for carrying animals.',
      ],
      clues: [
        "I'm so skinny I look like a pencil or a rocket ready to launch.",
        'My pointy top has eight sides, like a stop sign stretched upward.',
      ],
      draw(d) {
        const c = '#efe5ce';
        let s = d.P('94,62 100,24 106,62', '#e3d6b6') + d.R(99.4, 16, 1.2, 10, '#999');
        s += d.R(92, 60, 16, 22, c) + d.V(93, 62, 14, 18, 3.5, 1.4, '#8f877a');
        s += d.R(88, 80, 24, 26, c) + d.V(89, 83, 22, 20, 4.4, 1.8, '#8f877a');
        s += d.W(84, 104, 32, 92, c, { cw: 5.3, rh: 7, ww: 2.4, wh: 4.4, c: '#7b7f85' });
        s += d.W(72, 194, 56, 91, c, { cw: 6, rh: 7, ww: 2.8, wh: 4.4, c: '#7b7f85' });
        return s;
      },
    },
    {
      id: 'trump', name: 'Trump International Hotel & Tower', tier: 1, year: 2009, height: 1388, floors: 98,
      architect: 'Adrian Smith (SOM)',       spot: 'A shiny silver-blue glass tower with three step-backs and a tall spire.',
      facts: [
        "Its step-backs line up with the heights of its neighbors, like the Wrigley Building's top.",
        'Its architect, Adrian Smith, also designed the Burj Khalifa – the tallest building in the world.',
        "It's the 2nd-tallest building in Chicago when you count its spire.",
      ],
      clues: [
        "I'm a shiny silver glass tower that steps back three times and ends in a spire.",
        'My architect also designed the tallest building in the world, in Dubai.',
      ],
      draw(d) {
        const g = () => d.lg([[0, '#8aa3b7'], [0.5, '#e9f1f6'], [1, '#7f99ad']]);
        let s = d.P('98.6,52 100,6 101.4,52', '#c8d2da');
        const tiers = [[84, 50, 32, 46], [76, 94, 48, 58], [69, 150, 62, 62], [62, 210, 76, 75]];
        for (const [x, y, w, h] of tiers) s += d.R(x, y, w, h, g(), 'rx="4"') + d.V(x, y, w, h, 4, 0.8, 'rgba(70,95,115,.55)');
        for (const [x, y, w] of tiers) s += d.R(x, y, w, 2, '#f7fbfd', 'rx="1"');
        return s;
      },
    },
    {
      id: 'amaplaza', noShadow: true, name: 'AMA Plaza', aka: 'IBM Building (330 North Wabash)', tier: 2, year: 1973, height: 695, floors: 52,
      architect: 'Ludwig Mies van der Rohe',       spot: 'A plain, dark black box with a neat grid of bronze windows – no decorations at all.',
      facts: [
        'It was the last American office building designed by the famous architect Mies van der Rohe.',
        'Mies liked to say "less is more" – that\'s why it has no decorations.',
        "It used to be called the IBM Building. Now it's also home to a fancy hotel.",
      ],
      clues: [
        "I'm a dark box with a perfect grid of windows. My architect said 'less is more.'",
        'I used to be named after a famous computer company.',
      ],
      draw(d) {
        let s = d.W(50, 56, 100, 212, '#1b1c1f', { cw: 6.25, rh: 5.6, ww: 5, wh: 4.2, c: '#5c4b3a' });
        s += d.R(50, 56, 100, 6, '#242528');
        s += d.R(54, 268, 92, 17, '#b9c6cc') + d.V(50, 268, 100, 17, 12.5, 2.4, '#1b1c1f');
        return s;
      },
    },
    {
      id: 'marina', name: 'Marina City', tier: 1, year: 1964, height: 587, floors: 65,
      architect: 'Bertrand Goldberg', nickname: 'The Corncobs',
      spot: 'Two round towers that look exactly like corncobs, with parking on the bottom floors.',
      facts: [
        'The bottom 19 floors of each tower are a spiral parking garage – cars park right at the edge!',
        'It was a "city within a city" with apartments, offices, a theater, a marina and even a bowling alley.',
        'In a 1980 movie, a car flew off the parking ramp and splashed into the river.',
      ],
      clues: [
        "We're twin towers that look like corn on the cob!",
        'Our lowest floors are a spiral parking garage, and boats park at our feet.',
      ],
      draw(d) {
        let s = d.R(28, 264, 144, 21, '#c9c6bf') + d.R(28, 264, 144, 3, '#e5e2db');
        const cob = (cx) => {
          const r = 23;
          let o = d.R(cx - r, 60, 2 * r, 146, '#3b4048', 'rx="6"');
          for (let y = 62; y < 204; y += 4.6) {
            for (let k = 0; k < 4; k++) {
              const px = cx - r + 5.75 + k * 11.5;
              o += d.E(px, y + 2.4, 6.6, 2.2, '#f2efe7');
            }
          }
          o += d.E(cx, 60, r, 4, '#e8e4da');
          o += d.R(cx - r + 1, 206, 2 * r - 2, 58, '#d8d4cb');
          const cars = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#ecf0f1'];
          for (let i = 0; i < 9; i++) {
            const y = 210 + i * 6;
            o += d.L(cx - r + 1, y + 3.5, cx + r - 1, y, '#8a8680', 1.4);
            o += d.R(cx - 15 + ((i * 13) % 24), y - 0.5, 5, 2.4, cars[i % 6], 'rx="1"');
          }
          return o;
        };
        s += cob(64) + cob(136);
        s += d.P('40,281 54,281 50,284 43,284', '#fff') + d.P('146,281 162,281 158,284 150,284', '#fff');
        return s;
      },
    },
    {
      id: 'reidmurdoch', name: 'Reid Murdoch Building', tier: 3, year: 1914, height: 120, floors: 8,
      architect: 'George C. Nimmons',       spot: 'A long, low red-brick building with a clock tower, right on the river bank.',
      facts: [
        'It was a giant grocery warehouse – boats unloaded food right at its river doors.',
        'When the city widened LaSalle Street, it chopped a slice off the end of the building!',
        'Its clock tower has kept time over the river for more than 100 years.',
      ],
      clues: [
        "I'm long, low and made of red brick, with a clock tower in my middle.",
        'The city cut a slice off me to make a street wider!',
      ],
      draw(d) {
        const br = '#a64a30';
        let s = d.W(12, 184, 176, 101, br, { cw: 8, rh: 11, ww: 4, wh: 7, c: '#3a2a22' });
        for (const y of [184, 216, 250]) s += d.R(12, y, 176, 3, '#e8dcc0');
        s += d.W(84, 112, 32, 72, br, { cw: 8, rh: 11, ww: 3, wh: 6, c: '#3a2a22' });
        s += d.R(82, 108, 36, 5, '#e8dcc0') + d.P('84,108 100,90 116,108', '#6a8f80');
        s += d.C(100, 128, 9, '#f8f4ea', 'stroke="#2b2b2b" stroke-width="1.4"') + d.L(100, 128, 100, 122, '#222', 1.2) + d.L(100, 128, 104, 130, '#222', 1.2);
        return s;
      },
    },
    {
      id: 'leoburnett', name: 'Leo Burnett Building', tier: 3, year: 1989, height: 635, floors: 50,
      architect: 'Kevin Roche',       spot: 'A gray granite tower with green-tinted windows and a crown of tall columns on top.',
      facts: [
        'It\'s the home of the ad agency that created Tony the Tiger and the Jolly Green Giant!',
        'Its top has an open "crown" made of pairs of tall columns.',
        'The green-tinted window stripes make it look like a giant striped pillar.',
      ],
      clues: [
        "I'm gray with green window stripes and a crown of columns on my head.",
        'The people inside me invented Tony the Tiger.',
      ],
      draw(d) {
        let s = d.R(62, 60, 76, 225, '#9b9fa4') + d.V(62, 60, 76, 225, 7.6, 3.6, '#3e7a6a') + d.H(62, 60, 76, 225, 7, 1, '#9b9fa4');
        for (const x of [62, 85, 107, 130]) s += d.R(x, 38, 8, 24, '#a9adb2');
        s += d.R(60, 34, 80, 6, '#8e9297') + d.R(60, 58, 80, 4, '#8e9297');
        s += d.R(62, 270, 76, 15, '#3d4246');
        return s;
      },
    },
    {
      id: 'wacker333', noShadow: true, name: '333 Wacker Drive', tier: 2, year: 1983, height: 487, floors: 36,
      architect: 'Kohn Pedersen Fox',       spot: 'A curvy green glass building that bends right along the bend in the river.',
      facts: [
        'Its curved green glass follows the bend in the river exactly – it mirrors the water!',
        'On one side it is curved; on the other, flat and lined up with the city grid.',
        'Many Chicagoans vote it one of their favorite buildings.',
      ],
      clues: [
        "I'm green glass and I curve like the river in front of me – I'm a mirror for the water.",
        'I sit right where the river bends, and I bend too!',
      ],
      draw(d) {
        const g = d.lg([[0, '#1d5848'], [0.3, '#7cc6a5'], [0.5, '#c9f0df'], [0.75, '#5aa98b'], [1, '#1f5a4b']]);
        let s = d.R(40, 104, 120, 156, g) + d.H(40, 104, 120, 156, 5, 0.9, 'rgba(15,60,48,.45)') + d.V(40, 104, 120, 156, 10, 0.5, 'rgba(15,60,48,.3)');
        s += d.D('M40 210 Q100 180 160 214 L160 220 Q100 188 40 218 Z', 'rgba(255,255,255,.35)');
        s += d.R(38, 98, 124, 8, '#2a5f50');
        s += d.R(40, 258, 120, 27, '#7f8c86') + d.H(40, 258, 120, 27, 4, 1.6, '#5f6b66');
        for (const x of [58, 82, 118, 142]) s += d.C(x, 268, 4, '#2d3a35');
        return s;
      },
    },
    {
      id: 'mart', name: 'Merchandise Mart', tier: 1, year: 1930, height: 343, floors: 25,
      architect: 'Graham, Anderson, Probst & White', nickname: 'theMART',
      spot: 'A HUGE, wide tan building that stretches along the river for two whole blocks.',
      facts: [
        'When it opened it was the largest building in the world – it even had its own ZIP code!',
        'At night, giant artworks are projected onto its river side ("Art on theMART").',
        'Inside there are 4 million square feet – about 70 football fields!',
      ],
      clues: [
        "I'm so big I used to have my own ZIP code!",
        'At night, giant moving art is projected onto my side over the river.',
      ],
      draw(d) {
        const st = '#ccb68b', o = { cw: 5, rh: 7, ww: 2.4, wh: 4.6, c: '#5b574c' };
        let s = d.W(6, 156, 188, 129, st, o);
        s += d.W(76, 112, 48, 46, st, o) + d.R(86, 98, 28, 16, st) + d.V(88, 100, 24, 12, 4, 1.6, '#8b7b5c');
        s += d.W(6, 138, 22, 20, st, o) + d.W(172, 138, 22, 20, st, o);
        s += d.R(4, 154, 192, 3, '#b39d72') + d.R(74, 110, 52, 3, '#b39d72');
        const art = d.lg([[0, '#ff5e8a'], [0.33, '#ffd23f'], [0.66, '#38d9ff'], [1, '#7c5cff']]);
        s += d.R(10, 200, 180, 60, art, 'opacity=".28"');
        return s;
      },
    },
    {
      id: 'salesforce', name: 'Salesforce Tower Chicago', tier: 3, year: 2023, height: 818, floors: 60,
      architect: 'Pelli Clarke & Partners',       spot: 'A silvery glass tower made of three stacked blocks, standing where the river splits.',
      facts: [
        'It stands on Wolf Point, where the river splits into its North and South Branches.',
        "Wolf Point is where some of Chicago's very first settlers built cabins and a tavern in the 1820s.",
        'It was finished in 2023, making it one of the newest towers on the river.',
      ],
      clues: [
        "I'm a new glass tower made of three stacked blocks, standing where the river splits in two.",
        "I stand on a point named after a wolf, where Chicago's first settlers lived.",
      ],
      draw(d) {
        const g = () => d.lg([[0, '#6d8ea8'], [0.5, '#d3e4ef'], [1, '#6a8aa3']]);
        let s = '';
        const vols = [[64, 38, 66, 80], [57, 114, 82, 80], [50, 190, 96, 95]];
        for (const [x, y, w, h] of vols) s += d.R(x, y, w, h, g(), 'rx="9"') + d.V(x + 3, y, w - 6, h, 4, 0.9, 'rgba(60,85,105,.45)');
        s += d.R(60, 112, 74, 4, '#6fae63', 'rx="2"') + d.R(54, 188, 88, 4, '#6fae63', 'rx="2"');
        return s;
      },
    },
    {
      id: 'riverpoint', name: 'River Point', tier: 2, year: 2017, height: 730, floors: 52,
      architect: 'Pickard Chilton',       spot: 'A blue glass tower with a giant curved arch shape on its front and a park at its feet.',
      facts: [
        'It was built on top of busy railroad tracks – trains still run underneath!',
        'Its front has a huge curved shape called a parabolic arch.',
        'It has a 1.5-acre park along the river for everyone to enjoy.',
      ],
      clues: [
        'A huge curved arch runs up my blue glass front, and trains run under my feet.',
        "I have my own park by the river, and I'm built right on top of railroad tracks.",
      ],
      draw(d) {
        let s = d.D('M56 285 L56 76 Q100 50 144 76 L144 285 Z', '#5f8fb5') + d.D('M56 285 L56 76 Q100 50 144 76 L144 285 Z', d.pat(6, 5, 4.6, 3.2, '#9cc5e2'));
        s += d.D('M74 285 L74 150 Q100 40 126 150 L126 285 Z', d.lg([[0, '#9fd1ee'], [0.5, '#e9f7ff'], [1, '#9fd1ee']]), 'opacity=".9"');
        s += d.H(74, 70, 52, 215, 5, 0.8, 'rgba(60,110,150,.4)');
        s += d.R(30, 272, 140, 13, '#5fa35a');
        for (const x of [36, 48, 152, 164]) s += d.C(x, 270, 5, '#3e8a43');
        return s;
      },
    },
    {
      id: 'riverside150', name: '150 North Riverside', tier: 2, year: 2017, height: 748, floors: 54,
      architect: 'Goettsch Partners',       spot: 'A glass tower that balances on a super skinny base, like it\'s standing on tiptoes.',
      facts: [
        'Its site was squeezed between the river and train tracks, so it stands on a very skinny base.',
        'The tower gets wider above the base – like a person balancing on tiptoes!',
        'Its lobby has a giant wall of moving LED art.',
      ],
      clues: [
        "I'm balancing on tiptoes! My base is super skinny and I get wide up top.",
        "I'm squeezed between the river and the railroad tracks.",
      ],
      draw(d) {
        let s = d.R(52, 54, 96, 168, '#93afc4') + d.V(52, 54, 96, 168, 6, 1.6, '#e8f0f5') + d.H(52, 54, 96, 168, 5, 0.6, 'rgba(50,80,100,.35)');
        s += d.R(50, 50, 100, 6, '#6f8799');
        s += d.P('52,222 148,222 119,254 81,254', '#6f8da3');
        s += d.R(82, 254, 36, 31, '#d9dfe3');
        s += d.R(86, 258, 28, 24, d.lg([[0, '#ff5e8a'], [0.5, '#ffd23f'], [1, '#38d9ff']]), 'opacity=".85"');
        return s;
      },
    },
    {
      id: 'bofa110', name: 'Bank of America Tower', aka: '110 North Wacker', tier: 3, year: 2020, height: 817, floors: 55,
      architect: 'Goettsch Partners',       spot: 'A silvery glass tower whose top steps down like a staircase of fins.',
      facts: [
        'Its top steps down in a row of tall glass "fins," like a staircase.',
        'Its base has tall, slanted columns along the Riverwalk.',
        'It was finished in 2020, one of the newest towers on the river.',
      ],
      clues: [
        'My top looks like a staircase made of glass fins.',
        "I'm a brand-new silver tower with slanted legs along the Riverwalk.",
      ],
      draw(d) {
        const g = () => d.lg([[0, '#86a3b8'], [0.5, '#dce9f1'], [1, '#7f9cb1']]);
        let s = '';
        for (const [x, y] of [[62, 52], [87, 66], [112, 80]]) s += d.R(x, y, 26, 236 - y, g());
        s += d.V(62, 52, 76, 236, 4, 0.8, 'rgba(60,85,105,.45)');
        s += d.R(66, 232, 68, 53, '#4c6678');
        s += d.P('62,232 70,232 80,285 74,285', '#cfd8de') + d.P('138,232 130,232 120,285 126,285', '#cfd8de');
        s += d.P('96,232 104,232 102,285 98,285', '#cfd8de');
        return s;
      },
    },
    {
      id: 'boeing', name: '100 North Riverside', aka: 'Boeing Building', tier: 3, year: 1990, height: 535, floors: 36,
      architect: 'Skidmore, Owings & Merrill',       spot: 'A blue-gray glass building with giant steel trusses sticking up on its roof.',
      facts: [
        'Part of the building HANGS from giant steel trusses on its roof, because train tracks run underneath.',
        'For more than 20 years it was the world headquarters of Boeing, the airplane company.',
        'You can see the huge roof trusses from the river.',
      ],
      clues: [
        'Part of me hangs from giant steel trusses on my roof!',
        'An airplane company had its headquarters inside me.',
      ],
      draw(d) {
        let s = '';
        s += d.L(46, 82, 154, 82, '#4f5d6b', 3) + d.L(46, 112, 154, 112, '#4f5d6b', 3);
        for (let i = 0; i <= 8; i++) {
          const x = 46 + i * 13.5;
          s += d.L(x, 82, x, 112, '#4f5d6b', 2);
          if (i < 8) s += d.L(x, i % 2 ? 82 : 112, x + 13.5, i % 2 ? 112 : 82, '#4f5d6b', 2);
        }
        s += d.P('48,112 152,112 152,285 84,285 48,232', '#88a1b6');
        s += d.P('48,112 152,112 152,285 84,285 48,232', d.pat(6.5, 6, 5, 3.6, '#c4d8e6'));
        s += d.L(48, 232, 84, 285, '#4f5d6b', 2);
        return s;
      },
    },
    {
      id: 'opera', name: 'Civic Opera House', aka: '20 North Wacker', tier: 2, year: 1929, height: 555, floors: 45,
      architect: 'Graham, Anderson, Probst & White', nickname: "Insull's Throne",
      spot: 'A tall stone tower with two lower wings on each side – it looks like a giant throne chair.',
      facts: [
        "Legend says it's shaped like a giant throne or armchair.",
        'It is the home of the Lyric Opera of Chicago and has more than 3,500 seats.',
        'Along the river there\'s a long row of columns called a colonnade.',
      ],
      clues: [
        'I look like a giant throne – a tall back with two armrests.',
        'Singers in fancy costumes perform big musical shows inside me for more than 3,500 people.',
      ],
      draw(d) {
        const st = '#e3d5b4', o = { cw: 6, rh: 7, ww: 2.6, wh: 4.6, c: '#6f6a5e' };
        let s = d.W(72, 60, 56, 225, st, o) + d.R(70, 56, 60, 6, '#d2c39f');
        s += d.W(20, 170, 52, 115, st, o) + d.W(128, 170, 52, 115, st, o);
        s += d.R(18, 162, 12, 123, '#d9caa6') + d.R(170, 162, 12, 123, '#d9caa6');
        s += d.R(18, 166, 164, 4, '#d2c39f');
        s += d.R(20, 256, 160, 29, '#5f5646') + d.V(20, 256, 160, 29, 8, 4, '#eadfc4');
        s += d.R(18, 252, 164, 5, '#d2c39f');
        return s;
      },
    },
    {
      id: 'dailynews', name: 'Riverside Plaza', aka: 'Chicago Daily News Building', tier: 3, year: 1929, height: 302, floors: 26,
      architect: 'Holabird & Root',       spot: 'A stepped Art Deco stone building with a wide plaza and fountain right by the river.',
      facts: [
        'It was the first building in Chicago built over railroad tracks using "air rights."',
        'It was one of the first buildings to give the river a public plaza for people to enjoy.',
        'It was built for the Chicago Daily News newspaper.',
      ],
      clues: [
        'I was the first Chicago building built in the air above railroad tracks.',
        "I'm a stepped Art Deco building with a public plaza and a fountain by the water.",
      ],
      draw(d) {
        const st = '#e7dbbd', piers = (x, y, w, h) => d.R(x, y, w, h, st) + d.V(x, y, w, h, 5, 2.4, '#8d8574');
        let s = piers(18, 196, 164, 76) + piers(46, 164, 108, 108) + piers(70, 120, 60, 152);
        s += d.R(68, 116, 64, 5, '#d6c8a4') + d.R(44, 160, 112, 5, '#d6c8a4') + d.R(16, 192, 168, 5, '#d6c8a4');
        s += d.R(10, 272, 180, 13, '#d9d2c3') + d.E(100, 276, 18, 3, '#58b6e6') + d.R(98.5, 266, 3, 9, '#9ed8f5');
        return s;
      },
    },
    {
      id: 'boardoftrade', name: 'Chicago Board of Trade', tier: 2, year: 1930, height: 605, floors: 44,
      architect: 'Holabird & Root',       spot: 'Look down LaSalle Street: an Art Deco tower with a pyramid roof and a silver statue on top.',
      facts: [
        'The statue on top is Ceres, the Roman goddess of grain. She has no face!',
        "Why no face? The sculptor figured no building would ever be tall enough to look her in the eye.",
        'It was the tallest building in Chicago for 35 years.',
      ],
      clues: [
        'A faceless silver goddess of grain stands on my pyramid roof.',
        'People used to shout and wave inside me while buying and selling corn and wheat.',
      ],
      draw(d) {
        const st = '#e2d7bd', o = { cw: 6, rh: 7, ww: 2.6, wh: 4.6, c: '#6f6a5e' };
        let s = d.W(48, 196, 104, 89, st, o) + d.W(70, 112, 60, 173, st, o) + d.V(96, 112, 8, 150, 4, 1.4, '#a59a80');
        s += d.P('68,112 100,82 132,112', '#6f7f75');
        s += d.R(97, 62, 6, 20, '#cfd6db', 'rx="2"') + d.C(100, 59, 3.4, '#cfd6db') + d.P('103,64 110,54 106,66', '#d9c27a');
        s += d.C(100, 128, 7, '#f8f4ea', 'stroke="#2b2b2b" stroke-width="1.2"');
        return s;
      },
    },
    {
      id: 'willis', name: 'Willis Tower', aka: 'Sears Tower', tier: 1, year: 1973, height: 1451, floors: 110,
      architect: 'Bruce Graham & Fazlur Khan (SOM)',       spot: 'The tallest one! A black tower made of square tubes that step up, with two white antennas.',
      facts: [
        'It was the tallest building in the WORLD for about 25 years!',
        "It's made of 9 square tubes bundled together, like a bunch of straws.",
        'On the 103rd floor, glass boxes called The Ledge let you stand 1,353 feet in the air.',
      ],
      clues: [
        "I'm the tallest building in Chicago – a black giant with two white antennas.",
        "I'm made of nine square tubes bundled together, and I used to be named after a store.",
      ],
      draw(d) {
        const b = '#25282e', o = { cw: 5, rh: 4, ww: 3.4, wh: 2.4, c: '#4a5160' };
        let s = d.R(93, 6, 3, 36, '#eee') + d.R(116, 6, 3, 36, '#eee') + d.R(93, 6, 3, 4, '#e33') + d.R(116, 6, 3, 4, '#e33');
        s += d.W(67, 128, 22, 157, b, o) + d.W(111, 92, 22, 193, b, o) + d.W(89, 40, 33, 245, b, o);
        s += d.L(89, 128, 89, 285, '#111', 1.2) + d.L(111, 92, 111, 285, '#111', 1) + d.L(122, 40, 122, 92, '#111', 1);
        for (const [x, w, y] of [[89, 33, 62], [89, 44, 104], [67, 66, 168], [67, 66, 228]]) s += d.R(x, y, w, 2.5, '#5d6573');
        return s;
      },
    },
    {
      id: 'unionstation', noShadow: true, name: 'Union Station', tier: 3, year: 1925, height: 140, floors: 8,
      architect: 'Graham, Anderson, Probst & White',       spot: 'A grand stone train station with a long row of giant columns along the river.',
      facts: [
        'Inside is the Great Hall, a huge room with a giant skylight.',
        'A famous movie scene with a baby carriage bouncing down its stairs was filmed here.',
        'Trains have rolled in and out of it for 100 years.',
      ],
      clues: [
        'Trains arrive under me, and my Great Hall has a giant skylight.',
        "I'm a grand stone building lined with huge columns.",
      ],
      draw(d) {
        const st = '#e1d7c0';
        let s = d.W(16, 152, 168, 50, st, { cw: 7, rh: 8, ww: 3.2, wh: 5, c: '#6f6a5e' });
        s += d.R(14, 148, 172, 5, '#d1c6ab') + d.R(14, 200, 172, 6, '#d1c6ab');
        s += d.R(16, 206, 168, 58, '#4a443a');
        for (let x = 20; x < 182; x += 11) s += d.R(x, 206, 5, 58, '#ece3cd');
        s += d.R(14, 262, 172, 23, st) + d.W(16, 266, 168, 16, st, { cw: 10, rh: 16, ww: 4, wh: 10, c: '#6f6a5e' });
        s += d.R(99.4, 128, 1.2, 20, '#777') + d.P('100.6,128 112,131 100.6,134', '#c0392b');
        return s;
      },
    },
    {
      id: 'franklin', name: 'Franklin Center', aka: 'AT&T Corporate Center', tier: 3, year: 1989, height: 1007, floors: 60,
      architect: 'Adrian Smith (SOM)',       spot: 'A tall reddish-stone tower whose setbacks are topped with pointy spires, like a castle.',
      facts: [
        "At over 1,000 feet, it's one of the tallest buildings in Chicago.",
        'It was designed to look like the grand old skyscrapers of the 1920s and 30s.',
        'Pointy spires poke up from its top setbacks.',
      ],
      clues: [
        "I'm over 1,000 feet tall, made of reddish stone, and pointy spires stick up from my top.",
        "I'm a 1980s tower dressed up like an old-time skyscraper.",
      ],
      draw(d) {
        const st = '#b98f7b', o = { cw: 5.5, rh: 6, ww: 2.4, wh: 4, c: '#3e4a56' };
        let s = '';
        for (const x of [72, 128]) s += d.P(`${x - 3},88 ${x},56 ${x + 3},88`, '#a87e6a');
        for (const x of [88, 112]) s += d.P(`${x - 3},70 ${x},40 ${x + 3},70`, '#a87e6a');
        s += d.W(84, 68, 32, 30, st, o) + d.W(68, 86, 64, 199, st, o);
        s += d.W(58, 210, 84, 75, st, o);
        s += d.R(66, 84, 68, 4, '#9c705d') + d.R(82, 66, 36, 4, '#9c705d') + d.R(56, 206, 88, 4, '#9c705d');
        return s;
      },
    },
    {
      id: 'wacker311', name: '311 South Wacker', tier: 3, year: 1990, height: 961, floors: 65,
      architect: 'Kohn Pedersen Fox',       spot: 'A pinkish stone tower with a big glowing glass cylinder crown on top.',
      facts: [
        'When it was finished, it was the tallest concrete building in the world.',
        'Its giant glass crown glows brightly at night.',
        'Its crown is ringed by four little turrets.',
      ],
      clues: [
        'My crown is a giant glowing glass cylinder that lights up the night.',
        'I was once the tallest concrete building in the world.',
      ],
      draw(d) {
        const st = '#cda895', o = { cw: 5.5, rh: 6, ww: 2.6, wh: 4, c: '#59616b' };
        let s = '';
        const glow = d.lg([[0, '#efe0a8'], [0.5, '#fffdf0'], [1, '#efe0a8']]);
        s += d.R(84, 36, 32, 38, glow) + d.V(84, 36, 32, 38, 4, 1, 'rgba(180,150,90,.6)') + d.E(100, 36, 16, 3, '#fff8d8');
        for (const x of [78, 122]) s += d.R(x - 4, 56, 8, 20, st) + d.E(x, 56, 4, 1.6, '#fff3c0');
        s += d.W(78, 72, 44, 18, st, o) + d.W(70, 88, 60, 197, st, o) + d.W(58, 222, 84, 63, st, o);
        s += d.R(56, 218, 88, 4, '#b48f7c') + d.R(68, 86, 64, 3, '#b48f7c');
        return s;
      },
    },
    {
      id: 'postoffice', noShadow: true, name: 'The Old Post Office', tier: 2, year: 1932, height: 200, floors: 12,
      architect: 'Graham, Anderson, Probst & White',       spot: 'A gigantic stone building on the South Branch with an expressway running right through it!',
      facts: [
        'The Eisenhower Expressway goes right THROUGH the building – cars drive under it every day!',
        'It was once the largest post office in the world.',
        'Today it is full of offices and has a huge park on its roof.',
      ],
      clues: [
        'Cars on an expressway drive right through a tunnel in my middle!',
        'Millions of letters and packages were once sorted inside me every day.',
      ],
      draw(d) {
        const st = '#ddd2bb';
        let s = d.W(8, 142, 184, 103, st, { cw: 6, rh: 8, ww: 2.8, wh: 5, c: '#6b6a64' });
        s += d.R(6, 138, 188, 5, '#cbbf9f') + d.R(70, 150, 60, 80, st) + d.V(72, 150, 56, 80, 8, 3.4, '#bdb194');
        s += d.R(8, 245, 184, 40, st);
        const cars = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'];
        [56, 100, 144].forEach((x, i) => {
          s += d.D(`M${x - 18} 285 L${x - 18} 262 Q${x} 244 ${x + 18} 262 L${x + 18} 285 Z`, '#262626');
          s += d.R(x - 10, 277, 9, 5, cars[i], 'rx="1.5"') + d.R(x + 2, 278, 8, 4, cars[(i + 1) % 4], 'rx="1.5"');
        });
        return s;
      },
    },
  ];

  const TIERS = { 1: 'Rookie', 2: 'Pro', 3: 'Legend' };
  const BY_ID = Object.fromEntries(BUILDINGS.map((b, i) => [b.id, Object.assign(b, { stop: i + 1 })]));

  const api = { BUILDINGS, BY_ID, TIERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
