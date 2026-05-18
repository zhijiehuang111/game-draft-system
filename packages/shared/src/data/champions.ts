import type { Champion } from '../types/champion.js';

function placeholder(name: string): string {
  return `https://placehold.co/96x96/1e293b/e2e8f0?text=${encodeURIComponent(name)}`;
}

export const CHAMPIONS: readonly Champion[] = [
  { id: 'aegis', name: 'Aegis', imageUrl: placeholder('Aegis') },
  { id: 'bolt', name: 'Bolt', imageUrl: placeholder('Bolt') },
  { id: 'cipher', name: 'Cipher', imageUrl: placeholder('Cipher') },
  { id: 'drift', name: 'Drift', imageUrl: placeholder('Drift') },
  { id: 'ember', name: 'Ember', imageUrl: placeholder('Ember') },
  { id: 'frost', name: 'Frost', imageUrl: placeholder('Frost') },
  { id: 'gale', name: 'Gale', imageUrl: placeholder('Gale') },
  { id: 'hex', name: 'Hex', imageUrl: placeholder('Hex') },
  { id: 'ion', name: 'Ion', imageUrl: placeholder('Ion') },
  { id: 'jade', name: 'Jade', imageUrl: placeholder('Jade') },
  { id: 'kite', name: 'Kite', imageUrl: placeholder('Kite') },
  { id: 'lumen', name: 'Lumen', imageUrl: placeholder('Lumen') },
  { id: 'mirage', name: 'Mirage', imageUrl: placeholder('Mirage') },
  { id: 'nova', name: 'Nova', imageUrl: placeholder('Nova') },
  { id: 'onyx', name: 'Onyx', imageUrl: placeholder('Onyx') },
  { id: 'pulse', name: 'Pulse', imageUrl: placeholder('Pulse') },
  { id: 'quill', name: 'Quill', imageUrl: placeholder('Quill') },
  { id: 'rune', name: 'Rune', imageUrl: placeholder('Rune') },
  { id: 'sable', name: 'Sable', imageUrl: placeholder('Sable') },
  { id: 'tempo', name: 'Tempo', imageUrl: placeholder('Tempo') },
];
