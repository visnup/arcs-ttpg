const { Color, Vector, refObject, world } = require("@tabletop-playground/api");

function checkAmbitions() {
  // world.drawDebugBox(
  //   refObject.getExtentCenter(),
  //   refObject.getExtent(),
  //   refObject.getRotation(),
  //   new Color(1, 0, 1, 0.5),
  //   1,
  //   0.5,
  // );
  const above = world.boxTrace(
    refObject.getExtentCenter(),
    refObject.getExtentCenter().add(new Vector(0, 0, 20)),
    refObject.getExtent(),
  );
  const color = refObject.getPrimaryColor();
  const ambitions = { tycoon: 0, tyrant: 0, warlord: 0, keeper: 0, empath: 0 };
  for (const { object: obj } of above) {
    if (obj.getPrimaryColor().toHex() === color.toHex()) continue;
    switch (obj.getTemplateName()) {
      case "resource":
        switch (obj.getCardDetails().name) {
          case "fuel":
          case "material":
            ambitions.tycoon++;
            break;
          case "relics":
            ambitions.keeper++;
            break;
          case "psionic":
            ambitions.empath++;
            break;
        }
        break;
      case "agent":
        ambitions.tyrant++;
        // todo warlord
        break;
      case "city":
      case "ship":
      case "starport":
        ambitions.warlord++;
        break;
    }
  }

  const map = world.getObjectById("map");
  for (const [ambition, count] of Object.entries(ambitions))
    map.ambitions[ambition].setScore(color, count);
}

// check this board against
refObject.onHit.add(checkAmbitions);
refObject.onSnappedTo.add(checkAmbitions);
