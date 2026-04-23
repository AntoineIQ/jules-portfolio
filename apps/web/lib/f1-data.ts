import fs from "node:fs/promises";
import path from "node:path";
import type { F1Manifest, RacePayload, SeasonInsights, SeasonPayload } from "@/lib/f1-types";

const F1_ROOT = path.join(process.cwd(), "public", "data", "f1");

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadManifest(): Promise<F1Manifest | null> {
  return readJson<F1Manifest>(path.join(F1_ROOT, "manifest.json"));
}

export async function loadSeasonData(season: number, target: string): Promise<SeasonPayload | null> {
  return readJson<SeasonPayload>(path.join(F1_ROOT, "seasons", String(season), `${target}.json`));
}

export async function loadRaceData(
  season: number,
  round: number,
  target: string,
): Promise<RacePayload | null> {
  return readJson<RacePayload>(
    path.join(F1_ROOT, "races", String(season), String(round).padStart(2, "0"), `${target}.json`),
  );
}

export async function loadInsights(season: number): Promise<SeasonInsights | null> {
  return readJson<SeasonInsights>(path.join(F1_ROOT, "insights", `${season}.json`));
}
