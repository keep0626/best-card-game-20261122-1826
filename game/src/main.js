// main.js — boots Emberclash, wires mouse + keyboard, and runs the turn loop.
// Click a hand card to play it; click your creature, then an enemy, to attack.

import { newGame, startDuel, playHandCard, resolveSpell, attackWith, endTurn, checkEnd, logLine } from './game.js';
import { runEnemyTurn } from './ai.js';
import { renderAll, showToast } from './render.js';
import { setupShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '20261123');
let state = newGame(seed);

function refresh() {
  renderAll(state, { onHandClick, onCreatureClick });
}

function maybeEnemyTurn() {
  if (state.screen === 'playing' && state.turn === 'enemy') {
    runEnemyTurn(state, refresh).then(() => {
      refresh();
      if (state.screen === 'playing' && state.turn === 'player') {
        logLine(state, 'Your turn — play a card or attack.');
        refresh();
      }
    });
  }
}

function onHandClick(i) {
  if (state.screen !== 'playing' || state.turn !== 'player') return;
  const card = state.player.hand[i];
  if (!card) return;
  if (state.targetingSpell) {
    state.targetingSpell = null;
    state.selectedHand = -1;
    refresh();
    return;
  }
  if (card.cost > state.player.mana) {
    showToast(`Not enough mana — ${card.name} costs ${card.cost}.`);
    return;
  }
  if (card.kind === 'creature') {
    const result = playHandCard(state, 'player', i);
    if (!result.ok) { showToast(result.reason); return; }
    state.selectedHand = -1;
    state.selectedAttacker = -1;
    checkEnd(state);
    refresh();
    return;
  }
  // Spells: some need a target, others resolve at once.
  if (card.effect === 'bolt') {
    state.targetingSpell = { handIndex: i, card };
    state.selectedHand = i;
    showToast('Emberbolt — click an enemy creature or the Ash Warden.');
    refresh();
    return;
  }
  if (card.effect === 'stoneskin') {
    if (state.player.board.length === 0) {
      showToast('Stoneskin needs a friendly creature on the board.');
      return;
    }
    state.targetingSpell = { handIndex: i, card };
    state.selectedHand = i;
    showToast('Stoneskin — click one of your creatures.');
    refresh();
    return;
  }
  playHandCard(state, 'player', i);
  resolveSpell(state, 'player', card, null);
  state.selectedHand = -1;
  refresh();
}

function castTargetedSpell(targetKind, targetIndex) {
  const spell = state.targetingSpell;
  if (!spell) return false;
  const { card, handIndex } = spell;
  let target = null;
  if (card.effect === 'bolt') {
    if (targetKind === 'hero-enemy') target = state.enemy;
    else if (targetKind === 'creature-enemy') target = state.enemy.board[targetIndex];
    else return false;
  } else if (card.effect === 'stoneskin') {
    if (targetKind === 'creature-player') target = state.player.board[targetIndex];
    else return false;
  }
  if (!target) return false;
  playHandCard(state, 'player', handIndex);
  if (card.effect === 'bolt') {
    if (targetKind === 'hero-enemy') {
      state.enemy.hp -= card.amount;
      state.stats.damageDealt += card.amount;
      logLine(state, `Emberbolt hits the Ash Warden for ${card.amount}!`);
      checkEnd(state);
    } else {
      target.hp -= card.amount;
      if (target.hp <= 0) {
        const idx = state.enemy.board.indexOf(target);
        if (idx >= 0) state.enemy.board.splice(idx, 1);
        logLine(state, `Emberbolt destroys ${target.name}!`);
      } else {
        logLine(state, `Emberbolt hits ${target.name} for ${card.amount}.`);
      }
    }
  } else {
    resolveSpell(state, 'player', card, target);
  }
  state.targetingSpell = null;
  state.selectedHand = -1;
  refresh();
  return true;
}

function onCreatureClick(side, i) {
  if (state.screen !== 'playing' || state.turn !== 'player') return;
  if (state.targetingSpell) {
    const kind = state.targetingSpell.card.effect === 'bolt'
      ? (side === 'enemy' ? 'creature-enemy' : null)
      : (side === 'player' ? 'creature-player' : null);
    if (kind && castTargetedSpell(kind, i)) return;
    showToast('That is not a valid target for this spell.');
    return;
  }
  if (side === 'player') {
    const creature = state.player.board[i];
    if (!creature) return;
    if (!creature.canAttack) {
      showToast(`${creature.name} cannot attack yet — it just arrived or already attacked.`);
      return;
    }
    state.selectedAttacker = state.selectedAttacker === i ? -1 : i;
    refresh();
    return;
  }
  // Enemy creature clicked: attack it with the selected attacker.
  if (state.selectedAttacker < 0) return;
  const result = attackWith(state, 'player', state.selectedAttacker, 'creature', i);
  if (!result.ok) {
    showToast(result.reason);
    return;
  }
  state.selectedAttacker = -1;
  refresh();
}

function onHeroClick(side) {
  if (state.screen !== 'playing' || state.turn !== 'player') return;
  if (state.targetingSpell && state.targetingSpell.card.effect === 'bolt' && side === 'enemy') {
    castTargetedSpell('hero-enemy', -1);
    return;
  }
  if (state.selectedAttacker < 0 || side !== 'enemy') return;
  const result = attackWith(state, 'player', state.selectedAttacker, 'hero', -1);
  if (!result.ok) {
    showToast(result.reason);
    return;
  }
  state.selectedAttacker = -1;
  refresh();
}

document.getElementById('start-btn').addEventListener('click', () => {
  startDuel(state);
  refresh();
});
document.getElementById('again-btn').addEventListener('click', () => {
  state = newGame(seed + Math.floor(Math.random() * 1000));
  startDuel(state);
  refresh();
});
document.getElementById('restart').addEventListener('click', () => {
  state = newGame(seed + Math.floor(Math.random() * 1000));
  startDuel(state);
  refresh();
});
document.getElementById('end-turn').addEventListener('click', () => {
  if (state.screen !== 'playing' || state.turn !== 'player') return;
  endTurn(state);
  refresh();
  maybeEnemyTurn();
});
document.getElementById('enemy-hero').addEventListener('click', () => onHeroClick('enemy'));
document.getElementById('player-hero').addEventListener('click', () => onHeroClick('player'));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    state.selectedHand = -1;
    state.selectedAttacker = -1;
    state.targetingSpell = null;
    refresh();
    return;
  }
  if (event.key === 'r' || event.key === 'R') {
    state = newGame(seed + Math.floor(Math.random() * 1000));
    startDuel(state);
    refresh();
    return;
  }
  if (event.key === ' ' || event.key === 'Enter') {
    if (state.screen === 'title') {
      startDuel(state);
      refresh();
      return;
    }
    if (state.screen === 'playing' && state.turn === 'player') {
      event.preventDefault();
      endTurn(state);
      refresh();
      maybeEnemyTurn();
    }
    return;
  }
  const digit = Number(event.key);
  if (digit >= 1 && digit <= 7) {
    onHandClick(digit - 1);
  }
});

// Shot mode (?shot=title|table|win|loss) builds a fixed scene for screenshots.
if (params.get('shot')) {
  setupShot(state, params.get('shot'), seed);
}
refresh();
