// Fixed administrator verifier. Never store the plaintext password here.
import { verifyPassword } from './core.js';
const record = {
  "salt": [
    36,
    136,
    87,
    36,
    180,
    121,
    105,
    194,
    241,
    239,
    146,
    236,
    163,
    71,
    18,
    248
  ],
  "hash": [
    173,
    113,
    219,
    39,
    171,
    83,
    132,
    126,
    71,
    232,
    69,
    126,
    234,
    78,
    57,
    106,
    147,
    171,
    252,
    68,
    213,
    150,
    80,
    40,
    8,
    93,
    209,
    188,
    26,
    213,
    8,
    130
  ]
};
export function verifyAdminPassword(password) {
  return verifyPassword(password, record);
}
