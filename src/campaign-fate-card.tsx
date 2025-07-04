import type {
  CardHolder,
  Dice,
  GameObject,
  MultistateObject,
} from "@tabletop-playground/api";
import {
  refPackageId as _refPackageId,
  Card,
  globalEvents,
  refCard,
  Rotator,
  UIElement,
  Vector,
  world,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";
import type { InitiativeMarker } from "./initiative-marker";
import {
  above,
  getActionDecks,
  getBlockedResourceSnaps,
  getCourtSnaps,
  getPosition,
  getSystems,
  nearby,
  placeAid,
  placeBlight,
  placeChapterTrack,
  placeCourt,
  placeFreeCity,
  placeResources,
  placeShips,
  removeBlocks,
  removeNotes,
  removePlayers,
  resourceAmbitions,
  shuffledSlots,
  systemResource,
  takeCampaignCard,
  takeEventActionDeck,
} from "./lib/setup";

const refPackageId = _refPackageId;

export type TestableCard = Card & {
  onSnapped: { trigger: typeof takeFateSet };
  onClick: typeof campaignSetup;
};

refCard.onPrimaryAction.add(takeFateSet);
refCard.onSnapped.add(takeFateSet);
(refCard as TestableCard).onSnapped.trigger = takeFateSet;
refCard.onCustomAction.add(takeFateSet);
refCard.addCustomAction(
  "Take Matching Fate Set",
  "Spawns matching fate cards and items",
);
(refCard as TestableCard).onClick = campaignSetup;
showDeal(refCard);

// Campaign setup
function showDeal(card: Card) {
  if (
    card.getUIs().length ||
    card.getStackSize() !== 8 ||
    card.getAllCardDetails().some(({ index }) => index >= 8) // not A fates
  )
    return;
  card.addUI(
    Object.assign(new UIElement(), {
      position: new Vector(0, 0, card.getExtent(false, false).z + 0.05),
      scale: 0.15,
      widget: render(
        <verticalbox gap={10}>
          {[2, 3, 4].map((n) => (
            <button
              size={48}
              font="NeueKabelW01-Book.ttf"
              fontPackage={refPackageId}
              onClick={() => {
                campaignSetup(n, card);
                card.removeUI(0);
              }}
            >
              {` ${n} players `}
            </button>
          ))}
        </verticalbox>,
      ),
    }),
  );
}
function campaignSetup(players: number, card: Card) {
  // Randomly pick first player
  const slots = shuffledSlots(players);

  // Initiative marker to first player
  (world.getObjectById("initiative") as InitiativeMarker)?.take(slots[0]);

  // Shuffle action deck
  const action = getActionDecks();
  // 4p: add 1, 7s
  if (players === 4) action[0].addCards(action[1]);
  else action[1]?.destroy();
  // Add event action cards
  action[0].addCards(takeEventActionDeck(players === 4 ? 3 : 2) ?? action[0]);
  action[0].setRotation(new Rotator(0, -90, 0));
  action[0].shuffle();

  // Replace chapter track
  placeChapterTrack(
    world.getObjectByTemplateName("chapter-track"),
    world.getObjectByTemplateName("chapter"),
  );

  // Shuffle court deck
  world.getObjectByTemplateName("bc")?.destroy();
  const cc = world.getObjectByTemplateName<Card>("cc");
  if (cc) {
    const court = getCourtSnaps(0)[0];
    const p = cc.getPosition();
    cc.setPosition(court.getGlobalPosition());
    placeCourt(cc, players);
    // Lore
    const lore = getLore();
    lore.setPosition(p);
    cc.addCards(
      players < lore.getStackSize() ? lore.takeCards(players)! : lore,
    );
    cc.shuffle();
  }
  // Imperial Council card
  const imperialCouncil = takeCampaignCard("imperial council");
  imperialCouncil?.setPosition(getPosition(getCourtSnaps().at(-1)!).add(above));
  imperialCouncil?.snap();

  // Rules
  // 2p: Guild Envoys Depart edict
  if (players === 2) addRule(takeCampaignCard("guild envoys depart"));
  // Govern the Imperial Reach edict
  const policy = addRule(takeCampaignCard("govern the imperial reach"))!;
  const rules = policy.getHolder()!;
  // …remove non-policies
  for (const [i, c] of rules.getCards().slice(-2).entries()) {
    c.removeFromHolder();
    c.setPosition(rules.getPosition().add([10, i, 1]));
    c.snapToGround();
  }
  addRule(world.getObjectByTemplateName("book-of-law"));

  // Setup Imperial clusters
  const systems = getSystems();
  const i = Math.floor(Math.random() * 6);
  const imperial = [..."1234561".slice(i, i + 2)];
  const number = world.getObjectByTemplateName<Dice>("number");
  if (number)
    number.setCurrentFace(
      number.getAllFaceNames().findIndex((d) => d === imperial[0]),
    );
  const resources = new Map<string, number>();
  for (const cluster of imperial) {
    for (const i of "0123") {
      const system = systems
        .filter((d) => d.id === `${cluster}.${i}`)
        .map((d) => d.snap);
      placeShips(4, 1, nearby(getPosition(system)));

      // 2p: out of play resources
      if (slots.length === 2) {
        const r = systemResource(system[0]);
        if (r) resources.set(r, (resources.get(r) || 0) + 1);
      }
    }
  }
  const blockedResourceSnaps = getBlockedResourceSnaps();
  for (const [r, n] of resources) placeResources(r, n, blockedResourceSnaps[r]);
  for (const [a, n] of resourceAmbitions(resources))
    globalEvents.onAmbitionTallied.trigger(a, 4, n);

  // Free cities
  const e = Math.floor(Math.random() * 3);
  const outside = [..."123456"].filter((d) => !imperial.includes(d));
  const event = world.getObjectByTemplateName<Dice>("event");
  if (event) event.setCurrentFace(e);
  for (const cluster of outside)
    placeFreeCity(
      getPosition(
        systems
          .filter((d) => d.id === `${cluster}.${e + 1}`)
          .map((d) => d.snap),
      ),
    );

  // Spread blight
  for (const cluster of outside)
    for (const system of "0123")
      placeBlight(
        nearby(
          getPosition(
            systems
              .filter((d) => d.id === `${cluster}.${system}`)
              .map((d) => d.snap),
          ),
        ),
      );

  // Deal Fate cards
  card.shuffle();
  card.deal(2, slots, false, true);

  // Place Regent / Outlaw titles
  const titles = takeCampaignCard("imperial regent / outlaw");
  const flip = (card: Card) => card.flip();
  if (titles)
    for (const player of slots) {
      const board = world
        .getObjectsByTemplateName("board")
        .find((d) => d.getOwningPlayerSlot() === player);
      const snap = board
        ?.getAllSnapPoints()
        .find((d) => d.getTags().includes("title"));
      if (!snap) continue;
      const card = titles.getStackSize() === 1 ? titles : titles.takeCards(1);
      if (!card) break;
      card.addCustomAction("Flip");
      card.onCustomAction.add(flip);
      card.onPrimaryAction.add(flip);
      card.setPosition(snap.getGlobalPosition().add(above));
      card.snap();
    }

  // Place First Regent
  takeFirstRegent(slots[0]);

  // Turn to player setup in rules
  world
    .getObjectByTemplateName<MultistateObject>("campaign-rules")
    ?.setState(5);

  // Clean up unused components
  removeNotes((obj) => {
    const desc = obj.getDescription();
    return desc.includes("Shuffle") && !desc.includes("Campaign");
  });
  removeSetup();
  removeBlocks();
  removeLeaders();
  removeEvents();
  removePlayers([0, 1, 2, 3].filter((s) => !slots.includes(s)));

  // Place aids
  placeAid();
  placeAids();
}

function getLore() {
  const [deck, ...others] = world.getObjectsByTemplateName<Card>("lore");
  if (deck) {
    for (const d of others) deck.addCards(d);
    const { pitch, yaw } = deck.getRotation();
    deck.setRotation(new Rotator(pitch, yaw, 0));
    deck.shuffle();
  }
  return deck;
}

let rules = world.getObjectById("rules") as CardHolder | undefined;
function addRule(card?: Card) {
  if (!rules) {
    const { y, z } =
      world
        .getObjectsByTemplateName<Card>("city")
        .find((d) => d.getOwningPlayerSlot() === 4 && world.isOnTable(d))
        ?.getPosition() ?? world.getObjectById("map")!.getPosition();
    rules = world.createObjectFromTemplate("A86010E7BE44A8377F90F990AA8F9EAA", [
      5,
      y,
      z,
    ])! as CardHolder;
    rules.setId("rules");
    rules.setScale([1, 1.5, 1]);
    rules.snapToGround();
    rules.freeze();
  }
  if (card) {
    card.shuffle();
    rules.insert(card, rules.getNumCards());
    return card;
  }
}
function takeFirstRegent(slot: number) {
  const firstRegent = world.getObjectByTemplateName("first-regent");
  const firstBoard = world
    .getObjectsByTemplateName("board")
    .find((d) => d.getOwningPlayerSlot() === slot);
  if (firstRegent && firstBoard) {
    firstRegent.setPosition(
      firstBoard.getPosition().add([0, -firstBoard.getSize().y / 2 - 6.5, 1]),
    );
    firstRegent.snapToGround();
  }
}

function removeSetup() {
  for (const obj of world.getObjectsByTemplateName("setup")) obj.destroy();
}
function removeLeaders() {
  for (const obj of world.getObjectsByTemplateName("leader")) obj.destroy();
}
function removeEvents() {
  takeEventActionDeck()?.destroy();
}

// Aids
function placeAids() {
  const rules = world.getObjectByTemplateName("campaign-rules")?.getPosition();
  if (!rules) return;
  const p = new Vector(-rules.x, rules.y, rules.z);
  for (const [i, id] of [
    "12814B4F8748BF4D8A7FFD92AE4C5873",
    "F74E188D6E443D0C1E239297F328847F",
  ].entries())
    world.createObjectFromTemplate(id, p.add(new Vector(0, i * -18, 0)));
}

// Fate sets
const sets = [
  "73DF719A0343D704E1ACF6A3363E0054", // set-f22
  "2B60ABD93449333EED932DA5E4106C86", // set-round
  "05B97DFF5148801BAA34E382F56F2F1B", // set-seal
  "C7AE36E6EA4FD8BD8753119124902E01", // set-tile
];
const cards = [
  // a 1
  "8E0F28B0EE4140F2935ED79D2613F213",
  "63B3F50FF2AD4B02B2CC501BA39EEC01",
  "54169FB08FA04933B6578901FFA8C0AD",
  "FC7BE8EF9150452FA7D03AB1DF994ADA",
  "4E605426F389476AB81CE45CA401C96D",
  "7FD6DE8F638342E996C9E7123D0DBC89",
  "FFE1573B41DF4F93BAB50530216DE730",
  "2304554C215545FFA4903A276B119F71",
  // b 9
  "AC4ADF9302324F398D113E16A4F03B97",
  "EB9EEF05BD7F45B6A054960D5EA33F91",
  "ACB0FDC7ECFA4D809DB727268E2E3B68",
  "475FB4DAFD6C4213A532375B721D71A6",
  "19C94CA99CFF4ABCB92F48D241738734",
  "75AE9368EB5E493780479A7B64FA7A63",
  "D00CCF44C2E94E728E9D60E39F912E31",
  "A3B8A1367EB74E82A2C72BE5279C85DF",
  // c 17
  "2218441FB20345AB9299CC63B2FDB850",
  "D453C72939734F5C95A40E5697C2E043",
  "90F14836DDCB4D21AEB5D2F631440039",
  "AF0F0DF6A1A34341BC6CF2087592C8B2",
  "69F6C756533F4805ACA1439C462A223F",
  "555C38EACAA44B6386DF8EF81D432433",
  "823CC01194BE4095A7A247B99DC7D6B6",
  "86660B6732FF438BB8EE54B4C05A59CA",
];
function takeFateSet(card: Card) {
  if (card.getStackSize() > 1) return;
  if (card.getSavedData("taken")) return;

  const { index } = card.getCardDetails();

  // Lock
  if (card.getSnappedToPoint()) card.freeze();

  // Spawn fate cards downward of card
  const p = card.getPosition();
  const sign = Math.sign(p.x);
  let height = 6 + 1.8; // Height of fate card + tucked title card
  const deck = world.createObjectFromTemplate(
    cards[index],
    p.add([sign * height, 0, 1]),
  ) as Card | undefined;
  deck?.setRotation([0, 0, -180]);
  if (deck) height += adjust(deck);

  // Spawn any matching items found in sets
  const fate = `f${index + 1}`;
  for (const guid of sets) {
    const item = world.createObjectFromTemplate(
      guid,
      p.add([sign * height, 0, 1]),
    )!;
    if (item instanceof Card) {
      const metadata = item.getAllCardDetails().map((d) => d.metadata);
      const n = metadata.filter((n) => n === fate).length;
      if (item.getStackSize() > 1 && n < item.getStackSize()) {
        // find matching cards in deck by card name
        if (n) {
          const start = metadata.findIndex((n) => n === fate);
          const matched = item.takeCards(n, true, start)!;
          height += adjust(matched);
        }
        item.destroy();
      } else if (n > 0) {
        // single or all card match
        height += adjust(item);
      } else {
        // no match
        item.destroy();
      }
    }
  }
  function adjust(obj: GameObject) {
    const gap = 0.5;
    const { x } = obj.getSize();
    obj.setPosition(obj.getPosition().add([sign * (x / 2 + gap), 0, 0]));
    obj.snapToGround();
    return x + gap;
  }

  // Place objective marker
  const boards = world.getObjectsByTemplateName("board");
  const slot = boards
    .sort(
      (a, b) => a.getPosition().distance(p) - b.getPosition().distance(p),
    )[0]
    ?.getOwningPlayerSlot();

  const objective = world
    .getObjectsByTemplateName("objective")
    .find((d) => d.getOwningPlayerSlot() === slot);
  const setup = deck
    ?.getAllCardDetails()
    .find((d) => d.tags.includes("setup"))?.metadata;
  if (objective && setup) {
    const powers = setup.split(" ");
    const power = powers[boards.length - 2] ?? powers[0];
    const snaps = world
      .getObjectById("map")!
      .getAllSnapPoints()
      .filter((d) => d.getTags().includes("power"))
      .sort((a, b) => a.getLocalPosition().y - b.getLocalPosition().y);
    const p = snaps[+power - 1].getGlobalPosition().add(new Vector(0, 0, 10));
    objective.setPosition(
      world.lineTrace(p, p.add(new Vector(0, 0, -15)))[0]!.position.add(above),
    );
    objective.snap();
  }

  // Take first regent
  if (
    index === 0 || // Steward
    (index === 6 && // Admiral
      !world
        .getObjectsByTemplateName<Card>("fate")
        .some(
          (d) =>
            d.getSnappedToPoint() &&
            d.getStackSize() === 1 &&
            d.getCardDetails().index === 0,
        )) // and no Steward
  )
    takeFirstRegent(slot);

  // Clean up unused components
  removeNotes((obj) => obj.getDescription().startsWith("CAMPAIGN"));

  card.setSavedData(new Date().toISOString(), "taken");
}
