const { Vector, refObject, world } = require("@tabletop-playground/api");

function checkAmbitions() {
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
        const position = obj.getPosition().subtract(refObject.getPosition());
        const captive = position[1] / refObject.getSize()[1] >= 0.25;
        if (captive) ambitions.tyrant++;
        else ambitions.warlord++;
        break;
      case "city":
      case "ship":
      case "starport":
        ambitions.warlord++;
        break;
    }
  }
  // todo court cards

  const map = world.getObjectById("map");
  for (const [ambition, count] of Object.entries(ambitions))
    map.ambitions[ambition].setScore(color, count);
}

// Check this board against
refObject.onHit.add(checkAmbitions);
refObject.onSnappedTo.add(checkAmbitions);
