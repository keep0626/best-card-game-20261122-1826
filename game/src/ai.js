// ai.js — the Ash Warden: a readable, counterable opponent.
// Plays its best affordable cards, trades up when it can, and goes for lethal when it sees it.

import { playHandCard, resolveSpell, attackWith, endTurn, logLine, damageHero, dealDamage } from './game.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function lethalDamage(state) {
  return state.enemy.board.reduce((sum, c) => sum + (c.canAttack ? c.atk : 0), 0);
}

function chooseSpellTarget(state, card) {
  if (card.effect === 'bolt') {
    // Kill a dangerous player creature if possible, else hit the hero.
    const prey = state.player.board
      .filter((c) => c.hp <= card.amount)
      .sort((a, b) => b.atk - a.atk)[0];
    if (prey) return { kind: 'creature', ref: prey };
    return { kind: 'hero', ref: state.player };
  }
  if (card.effect === 'stoneskin') {
    const best = [...state.enemy.board].sort((a, b) => b.hp - a.hp)[0];
    if (best) return { kind: 'creature', ref: best };
    return null;
  }
  return { kind: 'self', ref: null };
}

export async function runEnemyTurn(state, onUpdate) {
  await sleep(650);
  if (state.screen !== 'playing' || state.turn !== 'enemy') return;

  // 1. Play cards: creatures first (biggest affordable), then spells that help.
  let guard = 0;
  while (guard < 12) {
    guard += 1;
    const playable = state.enemy.hand
      .map((card, i) => ({ card, i }))
      .filter(({ card }) => card.cost <= state.enemy.mana);
    if (playable.length === 0) break;

    const creature = playable
      .filter(({ card }) => card.kind === 'creature')
      .sort((a, b) => b.card.cost - a.card.cost)[0];
    const spell = playable.filter(({ card }) => card.kind === 'spell')[0];

    let pick = null;
    if (creature && (!spell || creature.card.cost >= 3)) pick = creature;
    else if (spell) pick = spell;
    else pick = creature;
    if (!pick) break;

    if (pick.card.kind === 'creature') {
      playHandCard(state, 'enemy', pick.i);
    } else {
      const card = pick.card;
      const target = chooseSpellTarget(state, card);
      if (card.effect === 'stoneskin' && !target) break;
      playHandCard(state, 'enemy', pick.i);
      if (card.effect === 'bolt') {
        if (target.kind === 'hero') {
          damageHero(state, 'player', card.amount, 'enemy');
          logLine(state, `Emberbolt hits you for ${card.amount}!`);
        } else {
          dealDamage(state, target.ref, card.amount, 'enemy');
          logLine(state, `Emberbolt destroys ${target.ref.name}!`);
        }
      } else {
        resolveSpell(state, 'enemy', card, target ? target.ref : null);
      }
    }
    onUpdate();
    await sleep(520);
    if (state.screen !== 'playing') return;
  }

  // 2. Attack: lethal first, then trade up against big threats, else go face.
  await sleep(420);
  let attacks = 0;
  while (attacks < 10 && state.screen === 'playing') {
    attacks += 1;
    const ai = state.enemy.board.findIndex((c) => c.canAttack);
    if (ai < 0) break;
    const attacker = state.enemy.board[ai];
    const guards = state.player.board.filter((c) => c.guard);
    if (lethalDamage(state) >= state.player.hp && guards.length === 0) {
      attackWith(state, 'enemy', ai, 'hero', -1);
    } else if (guards.length > 0) {
      const guardIdx = state.player.board.indexOf(guards.sort((a, b) => a.hp - b.hp)[0]);
      attackWith(state, 'enemy', ai, 'creature', guardIdx);
    } else {
      const preyIdx = state.player.board.findIndex((c) => c.hp <= attacker.atk && c.atk >= 3);
      if (preyIdx >= 0 && attacker.atk < state.player.hp) {
        attackWith(state, 'enemy', ai, 'creature', preyIdx);
      } else {
        attackWith(state, 'enemy', ai, 'hero', -1);
      }
    }
    onUpdate();
    await sleep(560);
  }

  await sleep(500);
  if (state.screen !== 'playing') return;
  endTurn(state);
  onUpdate();
}
