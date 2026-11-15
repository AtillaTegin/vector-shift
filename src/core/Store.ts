import type { SaveSystem } from './SaveSystem';
import type { AimTier } from '../render/AimVisualizer';

/**
 * In-game shop (catalogue + entitlements).
 *
 * Payments are NOT processed here. `purchase()` goes through a `PaymentProvider`:
 *  - `DevProvider` (current): test mode — unlocks instantly, for development / playtesting only.
 *  - `SteamProvider` (to add for release): Steam microtransactions (ISteamMicroTxn via the Steamworks Web API,
 *    started from the Electron main process with the player's Steam session). The game only unlocks an item
 *    after Steam reports the order as authorised + finalised — the client never touches card data.
 * Entitlements are stored in the save file; on Steam they should also be re-validated against the server.
 */
export interface StoreItem {
  sku: 'aim_x2' | 'aim_x4' | 'aim_full';
  tier: AimTier['id'];
  name: string;
  blurb: string;
  price: string;
}

export const CATALOGUE: StoreItem[] = [
  { sku: 'aim_x2', tier: 'x2', name: 'Vector Sight 2×', blurb: 'Guide line through 2 contacts, double-length object-ball arrow, speed readout.', price: '$0.99' },
  { sku: 'aim_x4', tier: 'x4', name: 'Vector Sight 4×', blurb: 'Guide through 4 contacts, 4× arrows, hazard warnings (falls, holes, sinks).', price: '$1.99' },
  { sku: 'aim_full', tier: 'full', name: 'Vector Sight FULL', blurb: 'The complete physics forecast: every bounce, portal, jump and the exact resting point.', price: '$3.99' },
];

export interface PaymentProvider {
  readonly testMode: boolean;
  buy(item: StoreItem): Promise<boolean>;
}

/** Development provider: no money moves, the item is simply granted. */
export class DevProvider implements PaymentProvider {
  readonly testMode = true;
  async buy() { return true; }
}

const TIER_ORDER: AimTier['id'][] = ['basic', 'x2', 'x4', 'full'];

export class Store {
  constructor(private readonly save: SaveSystem, private readonly provider: PaymentProvider = new DevProvider()) {}

  get testMode() { return this.provider.testMode; }
  owns(sku: StoreItem['sku']) { return this.save.data.owned.includes(sku); }

  /** Tiers the player may select (basic is always free). */
  unlockedTiers(): AimTier['id'][] {
    return TIER_ORDER.filter((t) => t === 'basic' || CATALOGUE.some((c) => c.tier === t && this.owns(c.sku)));
  }

  /** Currently equipped tier (falls back to the best owned one). */
  get tier(): AimTier['id'] {
    const sel = this.save.data.aimTier as AimTier['id'] | undefined;
    const unlocked = this.unlockedTiers();
    return sel && unlocked.includes(sel) ? sel : unlocked[unlocked.length - 1];
  }

  equip(t: AimTier['id']) { if (this.unlockedTiers().includes(t)) this.save.setAimTier(t); }

  async purchase(sku: StoreItem['sku']) {
    const item = CATALOGUE.find((c) => c.sku === sku)!;
    if (this.owns(sku)) return true;
    const ok = await this.provider.buy(item);
    if (ok) { this.save.grant(sku); this.save.setAimTier(item.tier); }
    return ok;
  }
}
