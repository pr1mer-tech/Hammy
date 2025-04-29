import { atom } from 'jotai';
import type { TokenData } from '@/types/token';
import type { Position } from '@/lib/types';

// Atom to store the selected tokens for liquidity operations
export const tokenAAtom = atom<TokenData | undefined>(undefined);
export const tokenBAtom = atom<TokenData | undefined>(undefined);

// Derived atom for the selected position
export const selectedPositionAtom = atom<Position | null>(null);

// Derived atom to automatically update tokenA and tokenB when a position is selected
export const selectPositionAtom = atom(
  null,
  (get, set, position: Position) => {
    // Update the selected position
    set(selectedPositionAtom, position);
    
    // We need to find the original token data to ensure we have complete TokenData objects
    // We'll use a simple approach that works for now - creating TokenData objects from position data
    const tokenA: TokenData = {
      address: position.tokenA.address as `0x${string}`,
      symbol: position.tokenA.symbol,
      logoURI: position.tokenA.logoURI,
      name: position.tokenA.symbol,
      decimals: 18, // Default value
    };
    
    const tokenB: TokenData = {
      address: position.tokenB.address as `0x${string}`,
      symbol: position.tokenB.symbol,
      logoURI: position.tokenB.logoURI,
      name: position.tokenB.symbol,
      decimals: 18, // Default value
    };
    
    // Update tokenA and tokenB atoms
    set(tokenAAtom, tokenA);
    set(tokenBAtom, tokenB);
    
    // Auto switch to the "remove" tab when a position is selected
    document.querySelector('[value="remove"]')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
  }
);