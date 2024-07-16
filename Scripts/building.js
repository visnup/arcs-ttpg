const { refCard, world } = require("@tabletop-playground/api");

// Card image index matches player slot
refCard.setOwningPlayerSlot(refCard.getCardDetails().index);
