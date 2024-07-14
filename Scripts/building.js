const { refCard, world } = require("@tabletop-playground/api");

const colors = {
  yellow: world.getSlotColor(0),
  blue: world.getSlotColor(1),
  red: world.getSlotColor(2),
  gray: world.getSlotColor(3),
};

// Set primary color to match against other color checks
refCard.setPrimaryColor(colors[refCard.getCardDetails().name]);
