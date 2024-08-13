import type { GameObject } from "@tabletop-playground/api";
import { refObject as _refObject, world } from "@tabletop-playground/api";
const refObject = _refObject;

// Track last advanced
let lastAdvanced = Date.now();
refObject.onReleased.add(() => {
  lastAdvanced = Date.now();
});

// Advance to the next chapter
refObject.onPrimaryAction.add(advance);
refObject.onCustomAction.add(advance);
refObject.addCustomAction("Advance Chapter", "Advance to the next chapter");

function advance(obj: GameObject) {
  const map = world.getObjectById("map");
  if (!map) return;
  const y = obj.getPosition().y + 0.5;
  const next = map
    .getAllSnapPoints()
    .find(
      (p) => p.getTags().includes("chapter") && p.getGlobalPosition().y > y,
    );
  if (!next) return;
  obj.setPosition(next.getGlobalPosition());
  lastAdvanced = Date.now();
}

const ext = Object.assign(refObject, {
  advance: function () {
    // Externally, only advance if 10 seconds have passed since last advance
    if (Date.now() - lastAdvanced < 10_000) return;
    advance(refObject);
  },
});
refObject.setId("chapter");
export type ChapterMarker = typeof ext;
