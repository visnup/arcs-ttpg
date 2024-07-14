const { refCard, world } = require("@tabletop-playground/api");

// Set primary color to match against other color checks
refCard.setPrimaryColor(world.getSlotColor(refCard.getCardDetails().index));
