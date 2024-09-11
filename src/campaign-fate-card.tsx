import type { MultistateObject, Player } from "@tabletop-playground/api";
import {
  refPackageId as _refPackageId,
  Card,
  CardHolder,
  Dice,
  GameObject,
  refCard,
  Rotator,
  UIElement,
  Vector,
  world,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";
import { InitiativeMarker } from "./initiative-marker";
import {
  above,
  blockedResourceSnaps,
  getActionDecks,
  getCourtSnaps,
  getPosition,
  getSystems,
  nearby,
  placeCourt,
  placeResources,
  placeShips,
  removeBlocks,
  removeNotes,
  removePlayers,
  systemResource,
} from "./setup-deck";
const refPackageId = _refPackageId;

if (refCard.getStackSize() > 1) {
  refCard.onPrimaryAction.add(showDeal);
} else {
  refCard.onSnapped.add(takeFateSet);
  refCard.onPrimaryAction.add(takeFateSet);
  refCard.onCustomAction.add(takeFateSet);
  refCard.addCustomAction(
    "Take Matching Fate Set",
    "Spawns matching fate cards and items",
  );
}

// Campaign setup
function showDeal(card: Card, player: Player) {
  if (
    card.getUIs().length ||
    card.getAllCardDetails().some(({ index }) => index >= 8)
  )
    return;
  const ui = new UIElement();
  ui.position = new Vector(0, 0, card.getExtent(false, false).z + 0.1);
  ui.scale = 0.2;
  ui.widget = render(
    <verticalbox gap={10}>
      {[2, 3, 4].map((n) => (
        <button
          size={48}
          font="NeueKabelW01-Book.ttf"
          fontPackage={refPackageId}
          onClick={(_, player) => {
            campaignSetup(n, card);
            card.removeUI(0);
          }}
        >
          {` ${n} players `}
        </button>
      ))}
    </verticalbox>,
  );
  card.addUI(ui);
}
function campaignSetup(players: number, card: Card) {
  // Players
  const needed = [
    ...new Set([...world.getAllPlayers().map((p) => p.getSlot()), 0, 1, 2, 3]),
  ]
    .filter((s) => 0 <= s && s <= 3)
    .slice(0, players)
    .sort();

  // Randomly pick first player
  const first = Math.floor(Math.random() * needed.length);
  const slots = needed.slice(first).concat(needed.slice(0, first));

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
  const bc = world.getObjectByTemplateName("bc");
  const cc = world.getObjectByTemplateName<Card>("cc");
  if (bc && cc) {
    const court = bc.getPosition();
    const p = cc.getPosition();
    bc.destroy();
    cc.setPosition(court);
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
  addRule(world.getObjectByTemplateName("book-of-law"));
  // 2p: Guild Envoys Depart edict
  if (players === 2) addRule(takeCampaignCard("guild envoys depart"));
  // Govern the Imperial Reach edict
  addRule(takeCampaignCard("govern the imperial reach"));

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
  for (const [r, n] of resources.entries())
    placeResources(r, n, blockedResourceSnaps[r]);

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
  card.deal(2, slots, false, true);

  // Place Regent / Outlaw
  const regentOutlaw = takeCampaignCard("imperial regent / outlaw");
  if (regentOutlaw)
    for (const player of slots) {
      const board = world
        .getObjectsByTemplateName("board")
        .find((d) => d.getOwningPlayerSlot() === player);
      const snap = board
        ?.getAllSnapPoints()
        .find((d) => d.getTags().includes("regent-outlaw"));
      if (!snap) continue;
      const card =
        regentOutlaw.getStackSize() === 1
          ? regentOutlaw
          : regentOutlaw.takeCards(1);
      card?.setPosition(snap.getGlobalPosition().add(above));
      card?.snap();
    }

  // Place First Regent
  const firstRegent = world.getObjectByTemplateName("first-regent");
  const firstBoard = world
    .getObjectsByTemplateName("board")
    .find((d) => d.getOwningPlayerSlot() === slots[0]);
  if (firstRegent && firstBoard) {
    firstRegent.setPosition(
      firstBoard
        .getPosition()
        .add(new Vector(0, -firstBoard.getSize().y / 2 - 6.5, 1)),
    );
  }

  // Turn to player setup in rules
  world
    .getObjectByTemplateName<MultistateObject>("campaign-rules")
    ?.setState(5);

  // Clean up unused components
  removeNotes();
  removeSetup();
  removeBlocks();
  removeLeaders();
  removeEvents();
  removePlayers([0, 1, 2, 3].filter((s) => !needed.includes(s)));
}

function takeEventActionDeck(n?: number) {
  const deck = world
    .getObjectsByTemplateName<Card>("dc")
    .find(
      (d) => d.getCardDetails().tags.includes("action") && world.isOnTable(d),
    );
  if (!deck) return;
  return n && n < deck.getStackSize() ? deck.takeCards(n) : deck;
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
function takeCampaignCard(name: string) {
  let card: Card | undefined;
  for (const deck of world.getObjectsByTemplateName<Card>("dc")) {
    for (let i = 0; i < deck.getStackSize(); i++) {
      const details = deck.getCardDetails(i)!;
      if (details.metadata === name) {
        const match =
          deck.getStackSize() === 1 ? deck : deck.takeCards(1, true, i--)!;
        if (card) card.addCards(match);
        else card = match;
      }
    }
  }
  return card;
}
let freeCity: Card | undefined;
function placeFreeCity(position: Vector) {
  freeCity ??= world
    .getObjectsByTemplateName<Card>("city")
    .find((d) => d.getOwningPlayerSlot() === 4);
  const city = freeCity?.takeCards(1);
  city?.setPosition(position.add(above));
  city?.snap();
}
let blight: Card | undefined;
function placeBlight(position: Vector) {
  blight ??= world
    .getObjectsByTemplateName("set-round")
    .find(
      (d) =>
        d instanceof Card &&
        d.getAllCardDetails().every(({ metadata }) => metadata === "blight"),
    ) as Card | undefined;
  blight?.takeCards(1)?.setPosition(position);
}

function placeChapterTrack(chapterTrack?: GameObject, chapter?: GameObject) {
  if (chapter && chapterTrack) {
    chapterTrack.setPosition(
      getPosition(
        world
          .getObjectById("map")!
          .getAllSnapPoints()
          .filter((d) => d.getTags().includes("chapter-overlay")),
      ).add(above),
    );
    chapterTrack.snap();
    chapterTrack.freeze();
    chapter.setPosition(
      chapterTrack
        .getAllSnapPoints()
        .map((d) => d.getGlobalPosition())
        .sort(
          ({ y: ay, z: az }, { y: by, z: bz }) => bz - az ?? ay - by, // Highest and to the left
        )[0]
        .add(above),
    );
    chapter.snap();
  }
}

let rules: CardHolder;
function addRule(card?: Card) {
  if (!rules) {
    const lore =
      world
        .getObjectsByTemplateName("lore")
        .find((d) => world.isOnTable(d))
        ?.getPosition() ?? world.getObjectById("map")!.getPosition();
    rules = world.createObjectFromTemplate(
      "A86010E7BE44A8377F90F990AA8F9EAA",
      new Vector(5, lore.y, lore.z),
    )! as CardHolder;
    rules.freeze();
  }
  if (card) {
    card.shuffle();
    rules.insert(card, rules.getNumCards());
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
let taken = false;
function takeFateSet(card: Card) {
  if (card.getStackSize() > 1) return;
  if (taken) return;

  const { index } = card.getCardDetails(0)!;

  // Spawn fate cards above card
  const dh = 0.2;
  let height = 1;
  const deck = world.createObjectFromTemplate(
    cards[index],
    card.getPosition().add(new Vector(0, 0, height)),
  ) as Card | undefined;
  if (deck) height += deck.getSize().z + dh;

  // Spawn any matching items found in sets
  const fate = `f${index + 1}`;
  for (const guid of sets) {
    const item = world.createObjectFromTemplate(
      guid,
      card.getPosition().add(new Vector(0, 0, height)),
    )!;
    if (item instanceof Card) {
      const names = item.getAllCardDetails().map((d) => d.name);
      const n = names.filter((n) => n === fate).length;
      if (item.getStackSize() > 1 && n < item.getStackSize()) {
        // find matching cards in deck by card name
        if (n) {
          const start = names.findIndex((n) => n === fate);
          const matched = item.takeCards(n, true, start)!;
          height += matched.getSize().z + dh;
        }
        item.destroy();
      } else if (n > 0) {
        // single or all card match
        height += item.getSize().z + dh;
      } else {
        // no match
        item.destroy();
      }
    }
  }

  // Place objective marker
  const p = card.getPosition();
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
    objective.setPosition(snaps[+power - 1].getGlobalPosition().add(above));
    objective.snap();
  }

  taken = true;
}
