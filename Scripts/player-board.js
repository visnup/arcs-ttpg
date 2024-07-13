const { refObject, world } = require("@tabletop-playground/api");

console.log(world.getAllObjects().length);

function checkAmbitions() {
  for (const obj of world.getAllObjects()) {
    obj.getTemplateMetadata();
    switch (obj.getTemplateName()) {
      // resources
      // pieces
      case "agent":
      case "ship":
        console.log(obj);
        break;
    }
  }
}

// check this board against
refObject.onHit.add((self, obj) => {
  // console.log(self.getPosition(), obj.getPosition());
  checkAmbitions();
});
