import { world, type CardHolder } from "@tabletop-playground/api";
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
  name: string;
  color: PlayerColor;
  initiative: boolean;
  power: number;
  objective: number;
  outrage: string[];
  resources: string[];
  cities: number;
  spaceports: number;
  ships: number;
  agents: number;
  favors: PlayerRank[];
  guild: string[];
  titles: string[];
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

export function sync() {
  const objects = world.getAllObjects();
  const players = world.getAllPlayers();
  const rules = world.getObjectById("rules") as CardHolder | undefined;

  const data: GameData = {
    campaign: !!rules,
    players: [],
    ambitions: [],
    court: [],
    edicts: [],
    laws: [],
  };

  fetch("https://localhost:8080/postkey_ttpg", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
