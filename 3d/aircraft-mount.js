/**
 * Align the actual S-320 geometry to a physical maintenance cradle.
 * This is deliberately independent of Three.js so placement math is testable.
 */
(function(root){
  'use strict';
  function planMount({fuselageMinY,aircraftMinY,floorY=-0.14,preferredDeckY=1.95,minClearance=0.12}){
    if (![fuselageMinY,aircraftMinY,floorY,preferredDeckY,minClearance].every(Number.isFinite)){
      throw new TypeError('S-320 maintenance stand requires finite geometry bounds');
    }
    if (minClearance < 0 || preferredDeckY <= floorY){
      throw new RangeError('S-320 maintenance stand must be above the floor');
    }
    // Lift at least to the rubber saddle; propeller/tail also stay above the floor.
    const elevation=Math.max(preferredDeckY-fuselageMinY,floorY+minClearance-aircraftMinY);
    const deckY=fuselageMinY+elevation;
    const clearance=aircraftMinY+elevation-floorY;
    return Object.freeze({elevation,deckY,clearance,floorY});
  }
  const api=Object.freeze({planMount});
  if(typeof module==='object' && module.exports)module.exports=api;
  if(root)root.TobitoAircraftMount=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
