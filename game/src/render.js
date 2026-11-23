// render.js — draws the whole table from state: heroes, boards, hands, log, screens.
// Every card is a DOM node: big numbers, colour AND shape per element, readable at thumbnail size.

import { ELEMENTS } from './cards.js';

const $ = (id) => document.getElementById(id);

export function cardElement(card, opts) {
  const el = ELEMENTS[card.element];
  const div = document.createElement('div');
  div.className = `card el-${card.element}${card.kind === 'spell' ? ' spell' : ''}`;
  if (opts.selected) div.classList.add('selected');
  if (opts.canAttack) div.classList.add('can-attack');
  if (opts.unplayable) div.classList.add('unplayable');
  if (opts.playable) div.classList.add('playable');
  if (opts.justPlayed) div.classList.add('just-played');
  div.dataset.uid = card.uid;

  const cost = document.createElement('div');
  cost.className = 'cost';
  cost.textContent = card.cost;
  div.appendChild(cost);

  const glyph = document.createElement('div');
  glyph.className = `elem ${el.cssClass}`;
  glyph.textContent = el.glyph;
  div.appendChild(glyph);

  const elName = document.createElement('div');
  elName.className = 'elem-name';
  elName.textContent = el.name.toUpperCase();
  div.appendChild(elName);

  const name = document.createElement('div');
  name.className = 'cname';
  name.textContent = card.name;
  div.appendChild(name);

  const art = document.createElement('div');
  art.className = `art ${el.artClass}`;
  art.textContent = el.glyph;
  div.appendChild(art);

  const text = document.createElement('div');
  text.className = 'ctext';
  text.textContent = card.text;
  div.appendChild(text);

  if (card.guard) {
    const guard = document.createElement('div');
    guard.className = 'guard-tag';
    guard.textContent = 'GUARD';
    div.appendChild(guard);
  }

  if (card.kind === 'creature') {
    const stats = document.createElement('div');
    stats.className = 'stats';
    const atk = document.createElement('div');
    atk.className = 'atk';
    atk.textContent = card.atk;
    const hp = document.createElement('div');
    hp.className = 'hp';
    hp.textContent = card.hp;
    stats.appendChild(atk);
    stats.appendChild(hp);
    div.appendChild(stats);
  }
  return div;
}

function renderBoard(container, board, side, state, onCreatureClick) {
  container.innerHTML = '';
  if (board.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'board-empty';
    empty.textContent = side === 'player' ? 'Your side of the table — play a creature!' : 'No enemy creatures yet.';
    container.appendChild(empty);
    return;
  }
  board.forEach((creature, i) => {
    const canAttack = side === 'player' && state.turn === 'player' && state.screen === 'playing' && creature.canAttack;
    const selected = side === 'player' && state.selectedAttacker === i;
    const el = cardElement(creature, { canAttack, selected });
    el.addEventListener('click', () => onCreatureClick(side, i));
    container.appendChild(el);
  });
}

function renderHand(state, onHandClick) {
  const hand = $('player-hand');
  hand.innerHTML = '';
  state.player.hand.forEach((card, i) => {
    const affordable = card.cost <= state.player.mana;
    const myTurn = state.turn === 'player' && state.screen === 'playing';
    const el = cardElement(card, {
      selected: state.selectedHand === i,
      playable: myTurn && affordable,
      unplayable: myTurn && !affordable,
    });
    el.addEventListener('click', () => onHandClick(i));
    hand.appendChild(el);
  });
  const enemyHand = $('enemy-hand');
  enemyHand.innerHTML = '';
  state.enemy.hand.forEach(() => {
    const back = document.createElement('div');
    back.className = 'mini-card';
    back.textContent = '?';
    enemyHand.appendChild(back);
  });
}

function renderHeroes(state) {
  $('player-hp-fill').style.width = Math.max(0, (state.player.hp / state.player.maxHp) * 100) + '%';
  $('player-hp-text').textContent = `${Math.max(0, state.player.hp)} / ${state.player.maxHp} HP`;
  $('enemy-hp-fill').style.width = Math.max(0, (state.enemy.hp / state.enemy.maxHp) * 100) + '%';
  $('enemy-hp-text').textContent = `${Math.max(0, state.enemy.hp)} / ${state.enemy.maxHp} HP`;
  const manaPips = (hero) => '◆'.repeat(hero.mana) + '◇'.repeat(Math.max(0, hero.maxMana - hero.mana));
  $('player-mana').innerHTML = `MANA <span class="crystal">${manaPips(state.player)}</span> ${state.player.mana}/${state.player.maxMana} · DECK ${state.player.deck.length}`;
  $('enemy-mana').innerHTML = `MANA <span class="crystal">${manaPips(state.enemy)}</span> ${state.enemy.mana}/${state.enemy.maxMana} · DECK ${state.enemy.deck.length}`;
  $('player-hero').classList.toggle('targetable', state.selectedAttacker >= 0 && state.turn === 'player');
  $('enemy-hero').classList.toggle('targetable', state.selectedAttacker >= 0 && state.turn === 'player');
}

export function renderAll(state, handlers) {
  renderHeroes(state);
  renderBoard($('enemy-board'), state.enemy.board, 'enemy', state, handlers.onCreatureClick);
  renderBoard($('player-board'), state.player.board, 'player', state, handlers.onCreatureClick);
  renderHand(state, handlers.onHandClick);

  const banner = $('turn-banner');
  if (state.screen === 'playing') {
    banner.textContent = state.turn === 'player'
      ? `YOUR TURN — Turn ${state.turnNumber} · click a card to play it`
      : `ASH WARDEN'S TURN…`;
    banner.classList.toggle('enemy', state.turn !== 'player');
  } else if (state.screen === 'title') {
    banner.textContent = 'EMBERCLASH — ready when you are';
    banner.classList.remove('enemy');
  } else {
    banner.textContent = state.screen === 'won' ? '★ VICTORY ★' : '✖ DEFEAT';
    banner.classList.toggle('enemy', state.screen === 'lost');
  }

  $('score-line').textContent =
    `SCORE ${state.stats.damageDealt} dmg dealt · ${state.stats.cardsPlayed} cards played · ${state.stats.creaturesSummoned} summoned`;
  $('surge-badge').classList.toggle('hidden', !state.surgeActive);
  $('end-turn').disabled = state.turn !== 'player' || state.screen !== 'playing';

  const log = $('log');
  log.innerHTML = '';
  for (const line of state.log) {
    const row = document.createElement('div');
    row.textContent = '› ' + line;
    log.appendChild(row);
  }

  $('title-screen').classList.toggle('hidden', state.screen !== 'title');
  const end = $('end-screen');
  end.classList.toggle('hidden', state.screen !== 'won' && state.screen !== 'lost');
  if (state.screen === 'won' || state.screen === 'lost') {
    const won = state.screen === 'won';
    const card = $('end-screen').querySelector('.end-card');
    card.classList.toggle('win', won);
    card.classList.toggle('lose', !won);
    $('end-glyph').textContent = won ? '▲' : '●';
    $('end-title').textContent = won ? 'VICTORY!' : 'DEFEAT';
    $('end-sub').textContent = won
      ? 'The Ash Warden falls. The table is yours — the four elements bow to you.'
      : 'The Ash Warden stands victorious… this time. Shuffle up and duel again.';
    $('end-stats').innerHTML =
      `<div><b>${state.stats.damageDealt}</b>damage dealt</div>` +
      `<div><b>${state.stats.cardsPlayed}</b>cards played</div>` +
      `<div><b>${state.turnNumber}</b>turns</div>` +
      `<div><b>${Math.max(0, state.player.hp)}</b>HP left</div>`;
  }
}

export function showToast(text, ms) {
  const toast = $('toast');
  toast.textContent = text;
  toast.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add('hidden'), ms || 2200);
}

export function floatDamage(text, x, y, heal) {
  const div = document.createElement('div');
  div.className = 'float-dmg' + (heal ? ' heal' : '');
  div.textContent = text;
  div.style.left = x + 'px';
  div.style.top = y + 'px';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 1050);
}
