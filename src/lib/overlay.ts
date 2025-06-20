import {
  Card,
  world,
  type CardHolder,
  type GameObject,
} from "@tabletop-playground/api";
import { type Ambition } from "../map-board";

type GameData = {
  campaign: boolean;
  players: PlayerData[];
  ambitions: AmbitionData[];
  court: CourtData[];
  edicts: string[];
  laws: string[];
};
type PlayerColor = "FFB700" | "0095A9" | "E1533D" | "D7D2CB" | "912AAD";
type PlayerRank = [PlayerColor, number];
type PlayerData = {
  name?: string;
  color: PlayerColor;
  initiative: boolean;
  power: number;
  outrage: string[];
  resources: string[];
  cities: number;
  spaceports: number;
  ships: number;
  agents: number;
  guild: string[];
  // campaign
  objective?: number;
  favors?: PlayerRank[];
  titles?: string[];
};
type AmbitionData = {
  name: Ambition;
  declared: number[];
  ranking: PlayerRank[];
};
type CourtData = {
  name: string;
  agents: PlayerRank[];
  // todo: attached
};

const isGuild = (d: GameObject): d is Card =>
  d instanceof Card && /^(bc|cc|lore|f\d+)$/.test(d.getTemplateName());
const cardName = (d: Card) => d.getCardDetails().name.replace(/\n.*/s, "");

export function sync() {
  const players = world.getAllPlayers();
  const objects = world.getAllObjects();
  const initiative = world.getObjectById("initiative")!.getPosition();
  const boards = objects.filter((d) => d.getTemplateName() === "board");
  const hasInitiative = boards.sort(
    (a, b) =>
      a.getPosition().distance(initiative) -
      b.getPosition().distance(initiative),
  )[0];
  const rules = world.getObjectById("rules") as CardHolder | undefined;

  const data: GameData = {
    campaign: !!rules,
    players: boards.map((board) => {
      const guild =
        world
          .getZoneById(`zone-player-court-${board.getId()}`)
          ?.getOverlappingObjects()
          .filter(isGuild)
          .map(cardName) ?? [];
      return {
        name: players
          .find((p) => p.getSlot() === board.getOwningPlayerSlot())
          ?.getName(),
        color: board.getPrimaryColor().toHex().slice(0, 6) as PlayerColor,
        initiative: board === hasInitiative,
        power: 0, // todo
        outrage: [], // todo
        resources: [], // todo
        cities: 0, // todo
        spaceports: 0, // todo
        ships: 0, // todo
        agents: 0, // todo
        guild,
        objective: 0, // todo
        favors: [], // todo
        titles: [], // todo
      };
    }),
    ambitions: [], // todo
    court: [], // todo
    edicts: [], // todo
    laws: [], // todo
  };
  console.log(JSON.stringify(data, null, 2));

  fetch("https://localhost:8080/postkey_ttpg", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
