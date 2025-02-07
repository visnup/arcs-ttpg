import {
  globalEvents,
  world,
  type Card,
  type Dice,
  type Player,
} from "@tabletop-playground/api";
import { type TestableCard as FateCard } from "../campaign-fate-card";
import { type TestableCard as SetupCard } from "../setup-deck";
import { createReset } from "./reset";
import { placeAgents, removeNotes } from "./setup";

const reset = createReset();
const pause = () => new Promise((r) => setTimeout(r, 5_000));

// `/screenshots` will cycle through all screenshot setups, pausing on each.
// `/screenshots n` will setup a single screenshot.
export async function onChatMessage(player: Player, message: string) {
  if (!message.startsWith("/screenshots")) return;

  const n = +(message.split(" ")[1]?.trim() || 0);

  reset();
  removeNotes(() => true);

  // 0: Overview
  // -----------

  // 4p setup
  const setupDeck = world
    .getObjectsByTemplateName<Card>("setup")
    .sort((a, b) => a.getPosition().x - b.getPosition().x)[2] as SetupCard;
  const setup = setupDeck.takeCards()! as SetupCard;
  setup.setPosition(setupDeck.getPosition().add([-8, 0, 0]));
  setupDeck.onRemoved.trigger(setup);

  // always be yellow
  if (player.getSlot() !== 0) player.switchSlot(0);

  // leaders
  const leaders = world
    .getObjectsByTemplateName<Card>("leader")
    .sort((a, b) => a.getPosition().y - b.getPosition().y);
  const snaps = world
    .getObjectsByTemplateName("board")
    .sort((a, b) => a.getOwningPlayerSlot() - b.getOwningPlayerSlot())
    .map((o) =>
      o.getAllSnapPoints().find((s) => s.getTags().includes("leader")),
    );
  for (const slot of [0, 1, 2, 3])
    leaders[1]
      .takeCards(1)!
      .setPosition(snaps[slot]!.getGlobalPosition().add([0, 0, 1]));

  // lore
  const lore = world.getObjectsByTemplateName<Card>("lore");
  const areas = world
    .getObjectsByTemplateName("board")
    .sort((a, b) => a.getOwningPlayerSlot() - b.getOwningPlayerSlot())
    .map((o) => o.getPosition());
  for (const slot of [0, 1, 2, 3]) {
    const c = lore[0].takeCards(1)!;
    c.setPosition(areas[slot].add([Math.sign(slot - 1.5) * 10, -9, 0.5]));
    c.freeze();
  }

  // run
  setup.flipOrUpright();
  setup.onPrimaryAction.trigger(setup);

  // camera
  // X=-52.353 Y=22.306 Z=139.607
  // P=-51.225000 Y=-27.000000 R=-0.000000
  player.setPositionAndRotation([-52, 22, 140], [-51, -27, 0]);
  if (n < 1) await pause();

  // 1: Card play
  // ------------

  // TODO discard
  // TODO play cards

  // camera
  // X=-7.030 Y=-6.196 Z=133.914
  // P=-58.127605 Y=-66.369830 R=-0.000000
  player.setPositionAndRotation([-7, -6, 134], [-58, -66, 0]);
  if (n < 2) await pause();

  // 2: Court and ambitions
  // ----------------------

  // declare
  globalEvents.onAmbitionDeclared.trigger("tycoon");

  // influence
  const court = world
    .getObjectByTemplateName("court")!
    .getAllSnapPoints()
    .map((s) => s.getGlobalPosition())
    .sort((a, b) => a.x - b.x);
  for (const a of placeAgents(0, 2, court[1].add([0.5, 7.5, 1])))
    a.setRotation([0, -45, 0]);
  placeAgents(1, 2, court[1].add([1, 2.5, 1]));
  placeAgents(2, 1, court[2].add([2, 8, 0]));

  // camera
  // X=-9.664 Y=31.365 Z=123.886
  // P=-77.675000 Y=-1.000000 R=-0.000000
  player.setPositionAndRotation([-10, 31, 123], [-78, -1, 0]);
  if (n < 3) await pause();

  // 3: Dice
  // -------
  const tray = world.getObjectByTemplateName("tray")!.getPosition();
  const raid = world.getObjectsByTemplateName<Dice>("raid").slice(0, 3);
  const skirmish = world.getObjectsByTemplateName<Dice>("skirmish").slice(0, 1);
  for (const [i, d] of raid.entries()) d.setPosition(tray.add([0, 0, i * 2]));
  for (const [i, d] of skirmish.entries())
    d.setPosition(tray.add([0, 0, (3 + i) * 2]));
  for (const d of raid.concat(skirmish)) d.roll();

  // camera
  // X=-14.430 Y=-101.991 Z=116.014
  // P=-38.179710 Y=76.055747 R=-0.000000
  player.setPositionAndRotation([-14, -102, 116], [-38, 76, 0]);
  if (n < 4) await pause();

  // 4: Campaign
  // -----------
  reset();
  removeNotes(() => true);

  // camera
  // X=-54.464 Y=61.328 Z=120.672
  // P=-53.171966 Y=14.528093 R=0.000000
  player.setPositionAndRotation([-54, 61, 121], [-53, 15, 0]);
  if (n < 5) await pause();

  // 5: Campaign setup
  // -----------------

  // 4p campaign
  const fates = world
    .getObjectsByTemplateName<Card>("fate")
    .sort((a, b) => a.getPosition().y - b.getPosition().y);
  // run setup
  (fates[0] as FateCard).onClick(4, fates[0]);

  // always be yellow
  if (player.getSlot() !== 0) player.switchSlot(0);

  // camera
  // X=-45.457 Y=15.734 Z=141.554
  // P=-59.413930 Y=7.673224 R=-0.000000
  player.setPositionAndRotation([-45, 16, 142], [-59, 8, 0]);
  if (n < 6) await pause();

  // 6: Fate sets
  // ------------

  // remove everything but fates
  reset();
  for (const o of world.getAllObjects())
    if (o.getTemplateName() !== "fate") o.destroy();

  // lay out fates
  const sets = world
    .getObjectsByTemplateName<Card>("fate")
    .sort((a, b) => a.getPosition().y - b.getPosition().y);
  const z = sets[0].getPosition().z;
  const size = sets[0].getSize();
  const length = sets[0].getStackSize();
  for (const [i, s] of sets.entries())
    for (let j = 0; j < length; j++) {
      const c = s.takeCards(1) ?? s;
      c.setPosition([
        (sets.length / 2 - i - 0.5) * (size.x + 1),
        (length / 2 - j - 0.5) * (size.y + 1),
        z,
      ]);
      c.setRotation([0, 0, 180]);
      (c as FateCard).onSnapped.trigger(c);
    }

  // camera
  // X=-12.687 Y=0.000 Z=130.761
  // P=-76.450000 Y=-0.000000 R=0.000000
  player.setPositionAndRotation([-13, 0, 130], [-76, 0, 0]);
  if (n < 6) await pause();
}
