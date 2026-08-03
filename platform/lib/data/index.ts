/**
 * Adapter selection.
 *
 * One env var decides where the platform reads from. Everything else in the
 * app imports `data` from here and never learns which one it got.
 */

import { seededAdapter } from "./seeded";
import { bigQueryAdapter } from "./bigquery";
import type { DataAdapter } from "./types";

const source = process.env.ZUMIQ_DATA_SOURCE ?? "seeded";

export const data: DataAdapter =
  source === "bigquery" ? bigQueryAdapter : seededAdapter;

export * from "./types";
