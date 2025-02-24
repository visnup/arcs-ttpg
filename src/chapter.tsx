import {
  refObject as _refObject,
  refPackageId as _refPackageId,
  globalEvents,
  UIElement,
  Vector,
  world,
  type Card,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";

const refObject = _refObject;
const refPackageId = _refPackageId;

globalEvents.onChapterEnded.add(showCleanUp);

function showCleanUp() {
  const ui = new UIElement();
  ui.position = new Vector(0, 0, refObject.getSize().z / 2 + 0.1);
  ui.scale = 0.15;
  ui.widget = render(
    <button
      size={48}
      font="NeueKabelW01-Book.ttf"
      fontPackage={refPackageId}
      onClick={cleanUp}
    >
      {" Clean Up "}
    </button>,
  );
  refObject.addUI(ui);
}

async function cleanUp() {
  refObject.removeUI(0);
  const snaps = world.getObjectById("map")!.getAllSnapPoints();

  // Flip lowest unflipped marker
  const markers = world.getObjectsByTemplateName<Card>("ambition");
  const unflipped = markers.filter((m) => Math.abs(m.getRotation().roll) < 1);
  if (unflipped.length) {
    unflipped
      .reduce((lowest, m) => (power(m) < power(lowest) ? m : lowest))
      .flipOrUpright();
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  // Re-sort
  markers.sort((a, b) => power(b) - power(a));
  // Return ambition markers
  const ambitions = snaps
    .filter((s) => s.getTags().includes("ambition"))
    .sort((a, b) => a.getLocalPosition().y - b.getLocalPosition().y);
  for (const [i, marker] of markers.entries())
    if (ambitions[i].getSnappedObject() !== marker)
      marker.setPosition(ambitions[i].getGlobalPosition().add([0, 0, 1]), 1.5);

  // Advance chapter
  const chapters = snaps
    .filter((s) => s.getTags().includes("chapter"))
    .sort((a, b) => a.getLocalPosition().y - b.getLocalPosition().y);
  const next =
    chapters[chapters.findIndex((s) => s.getSnappedObject() === refObject) + 1];
  if (next) refObject.setPosition(next.getGlobalPosition().add([0, 0, 1]), 1.5);
}

function power(marker: Card) {
  const flipped = Math.abs(marker.getRotation().roll) > 1;
  return +marker.getCardDetails(0)!.metadata.slice(flipped ? 2 : 0)[0];
}
