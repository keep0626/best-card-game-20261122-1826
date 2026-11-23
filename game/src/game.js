// game.js — the rules engine of Emberclash: turns, mana, combat, surge, win/loss.
// Pure state + rules; rendering lives in render.js, the AI in ai.js.

import { makeDeck, summonCreature } from './cards.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newHero() {
  return { hp: 30, maxHp: 30, mana: 0, maxMana: 0, deck: [], hand: [], board: [], fatigue: 0 };
}

export function newGame(seed) {
  const rng = mulberry32(seed);
  const state = {
    seed,
    screen: 'title',
    turn: 'player',
    turnNumber: 1,
    surgeActive: false,
    surgeElement: null,
    surgeCount: {},
    selectedHand: -1,
    selectedAttacker: -1,
    targetingSpell: null,
    log: [],
    stats: { damageDealt: 0, cardsPlayed: 0, turnsPlayed: 0, creaturesSummoned: 0 },
    player: newHero(),
    enemy: newHero(),
  };
  state.player.deck = makeDeck(rng);
  state.enemy.deck = makeDeck(rng);
  drawCards(state.player, 3);
  drawCards(state.enemy, 3);
  return state;
}

export function startDuel(state) {
  state.screen = 'playing';
  state.turn = 'player';
  beginTurn(state, state.player);
  logLine(state, 'The duel begins! You go first — 1 mana crystal.');
}

export function drawCards(hero, n) {
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (hero.deck.length === 0) {
      hero.fatigue += 1;
      hero.hp -= hero.fatigue;
      drawn.push(null);
    } else {
      drawn.push(hero.deck.pop());
    }
  }
  hero.hand.push(...drawn.filter(Boolean));
  return drawn;
}

export function beginTurn(state, hero) {
  hero.maxMana = Math.min(10, hero.maxMana + 1);
  hero.mana = hero.maxMana;
  for (const c of hero.board) c.canAttack = true;
  state.surgeActive = false;
  state.surgeElement = null;
  state.surgeCount = {};
  state.selectedHand = -1;
  state.selectedAttacker = -1;
  state.targetingSpell = null;
}

export function logLine(state, text) {
  state.log.unshift(text);
  if (state.log.length > 5) state.log.length = 5;
}

export function playHandCard(state, side, handIndex) {
  const hero = side === 'player' ? state.player : state.enemy;
  const foe = side === 'player' ? state.enemy : state.player;
  const card = hero.hand[handIndex];
  if (!card || hero.mana < card.cost) return { ok: false, reason: 'Not enough mana' };
  if (card.kind === 'creature' && hero.board.length >= 7) return { ok: false, reason: 'Board is full' };
  hero.mana -= card.cost;
  hero.hand.splice(handIndex, 1);
  state.stats.cardsPlayed += 1;

  // Elemental Surge: two cards of one element in a turn empowers your creatures.
  const el = card.element;
  state.surgeCount[el] = (state.surgeCount[el] || 0) + 1;
  if (state.surgeCount[el] === 2 && !state.surgeActive) {
    state.surgeActive = true;
    state.surgeElement = el;
    for (const c of hero.board) c.atk += 1;
    logLine(state, `ELEMENTAL SURGE! Two ${el} cards — your creatures gain +1 attack.`);
  }

  if (card.kind === 'creature') {
    const creature = summonCreature(card, side);
    hero.board.push(creature);
    state.stats.creaturesSummoned += 1;
    logLine(state, `${side === 'player' ? 'You play' : 'Ash Warden plays'} ${card.name} (${card.atk}/${card.hp}).`);
    return { ok: true, played: creature };
  }
  return { ok: true, spell: card };
}

export function resolveSpell(state, side, card, target) {
  const hero = side === 'player' ? state.player : state.enemy;
  const foe = side === 'player' ? state.enemy : state.player;
  switch (card.effect) {
    case 'bolt': {
      dealDamage(state, target, card.amount, side);
      logLine(state, `${card.name} hits for ${card.amount} damage!`);
      break;
    }
    case 'wildfire': {
      for (const c of [...foe.board]) dealDamage(state, c, card.amount, side);
      logLine(state, `Wildfire scorches every enemy creature for ${card.amount}!`);
      break;
    }
    case 'draw': {
      drawCards(hero, card.amount);
      logLine(state, `${side === 'player' ? 'You draw' : 'Ash Warden draws'} ${card.amount} cards.`);
      break;
    }
    case 'heal': {
      const healed = Math.min(card.amount, hero.maxHp - hero.hp);
      hero.hp += healed;
      logLine(state, `${side === 'player' ? 'You restore' : 'Ash Warden restores'} ${healed} HP.`);
      break;
    }
    case 'rally': {
      for (const c of hero.board) c.atk += card.amount;
      logLine(state, `Sunbloom! Your creatures gain +${card.amount} attack this turn.`);
      break;
    }
    case 'stoneskin': {
      if (target && target.owner === side) {
        target.hp += card.amount;
        target.maxHp += card.amount;
        logLine(state, `${target.name} gains +${card.amount} health.`);
      }
      break;
    }
    default:
      break;
  }
  checkEnd(state);
}

export function dealDamage(state, target, amount, bySide) {
  if (!target) return;
  target.hp -= amount;
  if (target.owner === 'player' || target.owner === 'enemy') {
    // A creature on the board.
    if (target.hp <= 0) {
      const board = target.owner === 'player' ? state.player.board : state.enemy.board;
      const idx = board.indexOf(target);
      if (idx >= 0) board.splice(idx, 1);
      logLine(state, `${target.name} is destroyed!`);
    }
  } else {
    // A hero object has no owner field; handled by callers.
  }
  if (bySide === 'player' && target === state.enemy) state.stats.damageDealt += amount;
}

export function damageHero(state, side, amount, bySide) {
  const hero = side === 'player' ? state.player : state.enemy;
  hero.hp -= amount;
  if (bySide === 'player' && side === 'enemy') state.stats.damageDealt += amount;
  checkEnd(state);
}

export function attackWith(state, side, attackerIndex, targetKind, targetIndex) {
  const hero = side === 'player' ? state.player : state.enemy;
  const foe = side === 'player' ? state.enemy : state.player;
  const attacker = hero.board[attackerIndex];
  if (!attacker || !attacker.canAttack) return { ok: false, reason: 'That creature cannot attack yet' };

  if (targetKind === 'hero') {
    const guards = foe.board.filter((c) => c.guard);
    if (guards.length > 0) return { ok: false, reason: 'A Guard creature blocks the way!' };
    damageHero(state, side === 'player' ? 'enemy' : 'player', attacker.atk, side);
    logLine(state, `${attacker.name} strikes the ${side === 'player' ? 'Ash Warden' : 'hero'} for ${attacker.atk}!`);
  } else {
    const target = foe.board[targetIndex];
    if (!target) return { ok: false, reason: 'No target there' };
    dealDamage(state, target, attacker.atk, side);
    dealDamage(state, attacker, target.atk, side === 'player' ? 'enemy' : 'player');
    logLine(state, `${attacker.name} trades blows with ${target.name}.`);
  }
  attacker.canAttack = false;
  checkEnd(state);
  return { ok: true };
}

export function endTurn(state) {
  if (state.screen !== 'playing') return;
  state.turn = state.turn === 'player' ? 'enemy' : 'player';
  state.stats.turnsPlayed += 1;
  if (state.turn === 'player') state.turnNumber += 1;
  const hero = state.turn === 'player' ? state.player : state.enemy;
  beginTurn(state, hero);
  if (state.turn === 'enemy') {
    logLine(state, "Ash Warden's turn — watch the board.");
  } else {
    drawCards(state.player, 1);
    logLine(state, `Turn ${state.turnNumber}: you draw a card. ${hero.maxMana} mana crystals.`);
  }
  if (state.turn === 'enemy') drawCards(state.enemy, 1);
  checkEnd(state);
}

export function checkEnd(state) {
  if (state.screen !== 'playing') return;
  if (state.enemy.hp <= 0 && state.player.hp <= 0) {
    state.screen = state.player.hp >= state.enemy.hp ? 'won' : 'lost';
  } else if (state.enemy.hp <= 0) {
    state.screen = 'won';
  } else if (state.player.hp <= 0) {
    state.screen = 'lost';
  }
  if (state.screen === 'won') logLine(state, 'VICTORY! The Ash Warden falls!');
  if (state.screen === 'lost') logLine(state, 'Defeat… the Ash Warden stands victorious.');
}
