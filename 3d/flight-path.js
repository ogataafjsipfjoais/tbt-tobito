/**
 * A measured route through the workshop, the hangar and out over Lake Biwa.
 * Coordinates are in the same Three.js world units as 3d/world.js.
 * One smooth monotonic path, never a scene teleport or detached cutaway camera.
 */
(function (root) {
  'use strict';
  const anchors = Object.freeze([
    [0, 0],
    [0.125, -17],
    [0.25, -43],
    [0.375, -65],
    [0.5, -90],
    [0.625, -113],
    [0.70, -130],  // approach the front arch
    [0.75, -147],  // enter the hangar, follow Tobito
    [0.81, -170],  // move directly under the 40m wing
    [0.875, -196], // come out of the far arch
    [0.94, -235],  // runway fades into open water
    [1, -275]
  ]);
  const landmarks = Object.freeze({
    entrance: -133,
    wing: -171,
    exit: -193,
    lake: -210
  });
  const clamp = x => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
  const ease = t => t * t * (3 - 2 * t);
  const lerp = (a,b,t) => a + (b-a)*t;

  function pathZ(progress) {
    const p=clamp(progress);
    for(let i=0;i<anchors.length-1;i++){
      const [p0,z0]=anchors[i],[p1,z1]=anchors[i+1];
      if(p<=p1){
        // A cubic Hermite blend: exact endpoints and zero velocity at the join.
        return lerp(z0,z1,ease((p-p0)/(p1-p0)));
      }
    }
    return anchors[anchors.length-1][1];
  }

  function sample(progress) {
    const p=clamp(progress);
    const z=pathZ(p);
    // Track just behind Tobito through the arches. No camera pullback
    // when reaching the wing and no sideways jumps between milestones.
    const tunnel=ease(clamp((p-.65)/.11)) * (1-ease(clamp((p-.88)/.075)));
    const lift=ease(clamp((p-.90)/.10));
    // Fixed chase distance guarantees the viewer NEVER drifts backward at a seam.
    const offset=9.5;
    const cameraZ=z+offset;
    const cameraY=lerp(3.8,4.2,tunnel)+11*lift;
    const lookZ=z-lerp(15.0,22.0,tunnel)-12*lift;
    const lookY=lerp(1.85,2.35,tunnel)+5.5*lift;
    const walkerY=8.5*ease(clamp((p-.91)/.09));
    return {progress:p,z,cameraZ,cameraY,lookZ,lookY,walkerY,tunnel,lift};
  }

  const api=Object.freeze({anchors,landmarks,pathZ,sample});
  if(typeof module !== 'undefined' && module.exports) module.exports=api;
  if(root) root.TobitoFlightPath=api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null);
