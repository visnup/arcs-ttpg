import {
  refObject as _refObject,
  refPackageId as _refPackageId,
  globalEvents,
  UIElement,
  Vector,
  world,
  type Card,
  type SnapPoint,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";

const refObject = _refObject;
const refPackageId = _refPackageId;

globalEvents.onChapterEnded.add(showCleanUp);

function showCleanUp() {
  refObject.addUI(
    Object.assign(new UIElement(), {
      position: new Vector(0, 0, refObject.getSize().z / 2 + 0.1),
      scale: 0.15,
      widget: render(
        <button
          size={48}
          font="NeueKabelW01-Book.ttf"
          fontPackage={refPackageId}
          onClick={cleanUp}
        >
          {" Clean Up "}
        </button>,
      ),
    }),
  );
}

export type TestableObject = typeof refObject & {
  onClick: typeof cleanUp;
};

(refObject as TestableObject).onClick = cleanUp;

async function cleanUp() {
  refObject.removeUI(0);
  const snaps = world.getObjectById("map")!.getAllSnapPoints();

  // Flip lowest unflipped marker
  const markers = world.getObjectsByTemplateName<Card>("ambition");
  const unflipped = markers.filter((m) => !m.isFaceUp());
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
  const track = world.getObjectByTemplateName<Card>("chapter-track");
  const act = (s: SnapPoint) =>
    track?.isFaceUp() ? s.getLocalPosition().z < 0 : s.getLocalPosition().z > 0;
  const chapters = (track ? track.getAllSnapPoints().filter(act) : snaps)
    .filter((s) => s.getTags().includes("chapter"))
    .sort((a, b) => a.getGlobalPosition().y - b.getGlobalPosition().y);
  const next =
    chapters[chapters.findIndex((s) => s.getSnappedObject() === refObject) + 1];
  if (next) refObject.setPosition(next.getGlobalPosition().add([0, 0, 1]), 1.5);
}

function power(marker: Card) {
  return +marker
    .getCardDetails(0)!
    .metadata.slice(marker.isFaceUp() ? 2 : 0)[0];
}
