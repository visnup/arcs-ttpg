const { refCard, world } = require("@tabletop-playground/api");

// Update ambitions on grab
refCard.onGrab.add(world.updateAmbitionsBelow);
refCard.onReleased.add(world.updateAmbitionsBelow);
