export type TargetMetric = {
  log_loss: number;
  brier: number;
  ece: number;
  "accuracy_at_0.5": number;
  n: number;
  base_rate_log_loss?: number;
  reduction_vs_floor?: number;
  model?: string;
  display?: string;
};

export type F1Manifest = {
  generated_at: string;
  model_version: string;
  primary_target: string;
  seasons: number[];
  available_rounds: Record<string, number[]>;
  targets: Record<
    string,
    {
      name: string;
      display: string;
      model: string;
      metrics?: TargetMetric;
      seasons: number[];
    }
  >;
};

export type SeasonCell = {
  driver: string;
  team: string;
  round: number;
  p: number;
  actual: 0 | 1;
  surprise: number;
  grid_position: number | null;
  finish_position: number | null;
};

export type SeasonDriver = {
  driver: string;
  team: string;
};

export type SeasonRace = {
  round: number;
  event_name: string;
  event_date: string;
};

export type SeasonPayload = {
  season: number;
  target: string;
  target_display: string;
  model: string;
  model_version: string;
  generated_at: string;
  metrics: TargetMetric;
  drivers: SeasonDriver[];
  races: SeasonRace[];
  cells: SeasonCell[];
  highlights: Array<{
    driver: string;
    team: string;
    round: number;
    event_name: string;
    p: number;
    actual: 0 | 1;
    surprise: number;
  }>;
};

export type RaceDriver = {
  driver: string;
  team: string;
  grid_position: number | null;
  p: number;
  actual: 0 | 1;
  finish_position: number | null;
  top_factors: { feature: string; value: number }[];
  explanation_kind: "shap" | "linear";
};

export type RacePayload = {
  season: number;
  round: number;
  event_name: string;
  event_date: string;
  target: string;
  target_display: string;
  model: string;
  model_version: string;
  generated_at: string;
  metrics: TargetMetric;
  summary: {
    top_driver: { driver: string; team: string; p: number };
    strongest_team: { team: string; mean_p: number };
    field_average: number;
    prediction_spread: number;
  };
  drivers: RaceDriver[];
};

export type SeasonInsights = {
  season: number;
  generated_at: string;
  model_version: string;
  reliability?: {
    target: string;
    model: string;
    bins: Array<{
      bin: number;
      lo: number;
      hi: number;
      n: number;
      mean_pred: number | null;
      frac_pos: number | null;
    }>;
    surprises: Array<{
      driver: string;
      team: string;
      round: number;
      event_name: string;
      p: number;
      actual: 0 | 1;
      surprise: number;
    }>;
  };
  targets: Record<
    string,
    {
      model: string;
      metrics: TargetMetric;
      highlights: Array<{
        driver: string;
        team: string;
        round: number;
        event_name: string;
        p: number;
        actual: 0 | 1;
        surprise: number;
      }>;
    }
  >;
};

export function targetEntries(manifest: F1Manifest): Array<[string, F1Manifest["targets"][string]]> {
  return Object.entries(manifest.targets);
}

export function formatTargetLabel(label: string): string {
  return label.replace(/^Race — /, "").replace(/^Qualifying — /, "").replace(/^Sprint — /, "");
}

export function circuitCode(name: string, round: number): string {
  const known: Record<string, string> = {
    "Bahrain Grand Prix": "BAH",
    "Saudi Arabian Grand Prix": "SAU",
    "Australian Grand Prix": "AUS",
    "Japanese Grand Prix": "JPN",
    "Chinese Grand Prix": "CHN",
    "Miami Grand Prix": "MIA",
    "Emilia Romagna Grand Prix": "IMO",
    "Monaco Grand Prix": "MON",
    "Canadian Grand Prix": "CAN",
    "Spanish Grand Prix": "ESP",
    "Austrian Grand Prix": "AUT",
    "British Grand Prix": "GBR",
    "Hungarian Grand Prix": "HUN",
    "Belgian Grand Prix": "BEL",
    "Dutch Grand Prix": "NED",
    "Italian Grand Prix": "ITA",
    "Azerbaijan Grand Prix": "AZE",
    "Singapore Grand Prix": "SIN",
    "United States Grand Prix": "USA",
    "Mexico City Grand Prix": "MEX",
    "São Paulo Grand Prix": "BRA",
    "Las Vegas Grand Prix": "LAS",
    "Qatar Grand Prix": "QAT",
    "Abu Dhabi Grand Prix": "ABU",
  };
  return known[name] ?? `R${round}`;
}
