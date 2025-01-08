import { refObject, world } from "@tabletop-playground/api";

// Step 2: Clean Up & Flip Ambition
// If Warlord was scored, return all Trophies. If Tyrant was scored, return all
// Captives.
// Return all ambition markers to the Available Markers spaces on the map.
// Flip over the ambition marker with the lowest Power that hasn’t been flipped
// yet to its side with more Power.
refObject.onSnapped.add((obj) => {
  // Clean up
  // Discard chapter markers and flip lowest
  obj.getSnappedToPoint();
});
