const { refObject, world } = require("@tabletop-playground/api");

// Update ambitions on grab
refObject.onGrab.add(world.updateAmbitionsBelow);
refObject.onReleased.add(world.updateAmbitionsBelow);
