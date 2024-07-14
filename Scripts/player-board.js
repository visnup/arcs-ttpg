const {
  ObjectType,
  Vector,
  refObject,
  world,
} = require("@tabletop-playground/api");

const color = refObject.getPrimaryColor();

// Link to matching card holders
let _holders;
function getHolders() {
  return (_holders ??= world
    .getAllObjects()
    .filter(
      (obj) =>
        obj.getAmbitions && obj.getPrimaryColor().toHex() === color.toHex(),
    ));
}

function updateAmbitions() {
  const ambitions = { tycoon: 0, tyrant: 0, warlord: 0, keeper: 0, empath: 0 };

  // Find all objects on the board
  const above = world.boxTrace(
    refObject.getExtentCenter(),
    refObject.getExtentCenter().add(new Vector(0, 0, 20)),
    refObject.getExtent(),
  );
  for (const { object: obj } of above) {
    if (obj.getPrimaryColor().toHex() === color.toHex()) continue;
    // Based on the object type, increment the appropriate ambition
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

  // Include court cards
  for (const court of getHolders())
    for (const [ambition, count] of Object.entries(court.getAmbitions()))
      ambitions[ambition] += count;

  // Update the ambitions on the map
  const map = world.getObjectById("map");
  for (const [ambition, count] of Object.entries(ambitions))
    map.ambitions[ambition].setScore(color, count);
}

// Check this board against
refObject.onHit.add(updateAmbitions);
refObject.onSnappedTo.add(updateAmbitions);
refObject.updateAmbitions = updateAmbitions;
