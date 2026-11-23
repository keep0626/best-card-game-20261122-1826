// cards.js — the card pool and deck builder for Emberclash.
// Four elements, told apart by colour AND shape: Ember ▲, Tide ●, Leaf ◆, Stone ■.

export const ELEMENTS = {
  ember: { name: 'Ember', glyph: '▲', artClass: 'art-ember', cssClass: 'el-ember' },
  tide: { name: 'Tide', glyph: '●', artClass: 'art-tide', cssClass: 'el-tide' },
  leaf: { name: 'Leaf', glyph: '◆', artClass: 'art-leaf', cssClass: 'el-leaf' },
  stone: { name: 'Stone', glyph: '■', artClass: 'art-stone', cssClass: 'el-stone' },
};

// Every card is an original design. Creatures fight on the board; spells resolve at once.
export const CARD_POOL = [
  { id: 'emberling', name: 'Emberling', element: 'ember', kind: 'creature', cost: 1, atk: 2, hp: 1, text: 'A spark with teeth.' },
  { id: 'cinder-pup', name: 'Cinder Pup', element: 'ember', kind: 'creature', cost: 2, atk: 3, hp: 2, text: 'Bites first, thinks never.' },
  { id: 'flame-dancer', name: 'Flame Dancer', element: 'ember', kind: 'creature', cost: 3, atk: 4, hp: 3, text: 'Dances through the fireline.' },
  { id: 'ash-phoenix', name: 'Ash Phoenix', element: 'ember', kind: 'creature', cost: 5, atk: 6, hp: 5, text: 'Burns out, rises again.' },
  { id: 'emberbolt', name: 'Emberbolt', element: 'ember', kind: 'spell', cost: 2, text: 'Deal 3 damage to any target.', effect: 'bolt', amount: 3 },
  { id: 'wildfire', name: 'Wildfire', element: 'ember', kind: 'spell', cost: 4, text: 'Deal 2 damage to every enemy creature.', effect: 'wildfire', amount: 2 },
  { id: 'tide-sprite', name: 'Tide Sprite', element: 'tide', kind: 'creature', cost: 1, atk: 1, hp: 3, text: 'Slippery as a wave.' },
  { id: 'current-eel', name: 'Current Eel', element: 'tide', kind: 'creature', cost: 2, atk: 2, hp: 3, text: 'Strikes from the deep.' },
  { id: 'wave-knight', name: 'Wave Knight', element: 'tide', kind: 'creature', cost: 3, atk: 3, hp: 5, text: 'Armour of falling water.' },
  { id: 'tide-leviathan', name: 'Tide Leviathan', element: 'tide', kind: 'creature', cost: 6, atk: 7, hp: 7, text: 'The whole sea, angry.' },
  { id: 'deep-draw', name: 'Deep Draw', element: 'tide', kind: 'spell', cost: 2, text: 'Draw 2 cards.', effect: 'draw', amount: 2 },
  { id: 'soothing-rain', name: 'Soothing Rain', element: 'tide', kind: 'spell', cost: 2, text: 'Restore 6 HP to your hero.', effect: 'heal', amount: 6 },
  { id: 'thorn-sprout', name: 'Thorn Sprout', element: 'leaf', kind: 'creature', cost: 1, atk: 1, hp: 2, text: 'Small, sharp, everywhere.' },
  { id: 'bramble-wolf', name: 'Bramble Wolf', element: 'leaf', kind: 'creature', cost: 2, atk: 3, hp: 2, text: 'Runs with the roots.' },
  { id: 'grove-warden', name: 'Grove Warden', element: 'leaf', kind: 'creature', cost: 4, atk: 4, hp: 6, text: 'The forest stands behind it.' },
  { id: 'sunbloom', name: 'Sunbloom', element: 'leaf', kind: 'spell', cost: 3, text: 'Give your creatures +2 attack this turn.', effect: 'rally', amount: 2 },
  { id: 'pebble-golem', name: 'Pebble Golem', element: 'stone', kind: 'creature', cost: 2, atk: 2, hp: 4, guard: true, text: 'Guard — enemies must attack it first.' },
  { id: 'granite-bear', name: 'Granite Bear', element: 'stone', kind: 'creature', cost: 3, atk: 3, hp: 5, guard: true, text: 'Guard — a wall that walks.' },
  { id: 'mountain-titan', name: 'Mountain Titan', element: 'stone', kind: 'creature', cost: 7, atk: 8, hp: 8, guard: true, text: 'Guard — the mountain moves.' },
  { id: 'stone-skin', name: 'Stoneskin', element: 'stone', kind: 'spell', cost: 1, text: 'Give a friendly creature +0/+3.', effect: 'stoneskin', amount: 3 },
];

export function cardById(id) {
  return CARD_POOL.find((c) => c.id === id);
}

export function makeDeck(rng) {
  const deck = [];
  for (const card of CARD_POOL) {
    const copies = card.cost >= 6 ? 1 : 2;
    for (let i = 0; i < copies; i++) deck.push({ ...card, uid: card.id + '-' + i });
  }
  // Fisher-Yates shuffle with the caller's seeded rng.
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, 24);
}

export function summonCreature(card, owner) {
  return {
    ...card,
    uid: card.id + '-b' + Math.floor(Math.random() * 1e9).toString(36),
    owner,
    maxHp: card.hp,
    canAttack: false,
    justPlayed: true,
  };
}
