// shots.js — builds fixed, deterministic scenes for the entry's screenshots.
// ?shot=title shows the title screen, ?shot=table a busy mid-game table,
// ?shot=win the victory screen, ?shot=loss the defeat screen.

import { cardById, summonCreature } from './cards.js';
import { logLine } from './game.js';

function placeCreature(state, side, id, atk, hp) {
  const def = cardById(id);
  const creature = summonCreature(def, side);
  creature.atk = atk;
  creature.hp = hp;
  creature.maxHp = hp;
  creature.canAttack = true;
  creature.justPlayed = false;
  state[side].board.push(creature);
  return creature;
}

function handCard(state, side, id) {
  const def = cardById(id);
  state[side].hand.push({ ...def, uid: def.id + '-shot' + state[side].hand.length });
}

export function setupShot(state, shot, seed) {
  if (shot === 'title') {
    state.screen = 'title';
    return;
  }
  state.screen = 'playing';
  state.turn = 'player';
  state.player.maxMana = 6;
  state.player.mana = 4;
  state.enemy.maxMana = 5;
  state.enemy.mana = 2;

  if (shot === 'table') {
    state.turnNumber = 6;
    state.player.hp = 24;
    state.enemy.hp = 19;
    state.stats.damageDealt = 11;
    state.stats.cardsPlayed = 9;
    state.stats.creaturesSummoned = 6;
    placeCreature(state, 'player', 'flame-dancer', 4, 3);
    placeCreature(state, 'player', 'granite-bear', 3, 5);
    placeCreature(state, 'player', 'current-eel', 2, 3);
    placeCreature(state, 'enemy', 'wave-knight', 3, 5);
    placeCreature(state, 'enemy', 'cinder-pup', 3, 2);
    handCard(state, 'player', 'emberbolt');
    handCard(state, 'player', 'ash-phoenix');
    handCard(state, 'player', 'soothing-rain');
    handCard(state, 'player', 'pebble-golem');
    handCard(state, 'player', 'bramble-wolf');
    handCard(state, 'enemy', 'tide-sprite');
    handCard(state, 'enemy', 'wildfire');
    state.surgeActive = true;
    state.surgeElement = 'ember';
    logLine(state, 'ELEMENTAL SURGE! Two ember cards — your creatures gain +1 attack.');
    logLine(state, 'Granite Bear holds the line with Guard.');
    logLine(state, 'Flame Dancer strikes the Ash Warden for 4!');
    logLine(state, 'Turn 6: you draw a card. 6 mana crystals.');
    return;
  }

  if (shot === 'win') {
    state.turnNumber = 9;
    state.player.hp = 12;
    state.enemy.hp = 0;
    state.stats.damageDealt = 30;
    state.stats.cardsPlayed = 14;
    state.stats.creaturesSummoned = 9;
    placeCreature(state, 'player', 'ash-phoenix', 6, 5);
    placeCreature(state, 'player', 'flame-dancer', 4, 2);
    state.screen = 'won';
    logLine(state, 'VICTORY! The Ash Warden falls!');
    return;
  }

  if (shot === 'loss') {
    state.turnNumber = 8;
    state.player.hp = 0;
    state.enemy.hp = 17;
    state.stats.damageDealt = 13;
    state.stats.cardsPlayed = 11;
    state.stats.creaturesSummoned = 7;
    placeCreature(state, 'enemy', 'tide-leviathan', 7, 7);
    placeCreature(state, 'enemy', 'wave-knight', 3, 4);
    state.screen = 'lost';
    logLine(state, 'Defeat… the Ash Warden stands victorious.');
    return;
  }
  void seed;
}
