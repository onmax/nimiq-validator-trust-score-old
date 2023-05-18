import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Result } from 'ftld';
import { Address } from 'nimiq-rpc-client-ts';
import { Event, EventName, Score } from '../types';
import { Database } from './types';

type Table = keyof Database["public"]["Tables"]
type Row<T extends Table> = Database["public"]["Tables"][T]["Row"]
type Insert<T extends Table> = Database["public"]["Tables"][T]["Insert"]

export type Validator = Row<"validators">
type ValidatorScore = Pick<Validator, "address" | "name" | "updated_at"> & { score?: Pick<Row<"validator_score">, "score" | "score_age" | "score_size" | "score_uptime" | "computed_at"> }
type BasicValidator = Pick<Validator, "address" | "name" | "updated_at"> & Pick<Row<"validator_score">, "score">

export default class PostgresClient {
  private static client: SupabaseClient<Database>;
  static events: { [key in EventName]?: number } = {}

  constructor(url: URL, key: string) {
    PostgresClient.client = createClient<Database>(url.href, key)
  }

  async insertValidator(address: Address): Promise<Result<string, Row<"validators">>> {
    const { data: validator, error: validatorError } = await PostgresClient.client.from("validators").select().eq("address", address).single();
    if (validatorError) {
      const { data, error } = await PostgresClient.client.from("validators").insert({ address, genesis: false, tracked: false }).select().single();
      if (error) return Result.Err<string, Row<"validators">>(error.message);
      return Result.Ok<string, Row<"validators">>(data!);
    } else {
      return Result.Ok<string, Row<"validators">>(validator!);
    }
  }

  async insertScore(address: Address, score: Score): Promise<Result<string, ValidatorScore>> {
    const { data: validator, error: validatorError } = await PostgresClient.client.from("validators").select().eq("address", address).single();
    if (validatorError) return Result.Err<string, ValidatorScore>(validatorError.message);

    if (!validator.tracked) {
      return Result.Err<string, ValidatorScore>(`Validator ${address} is not tracked`);
    }

    const { data: validatorScore, error: validatorScoreError } = await PostgresClient.client.from("validator_score")
      .upsert({ validator: validator.id, ...score }, { onConflict: 'validator' }).select().single();
    if (validatorScoreError) return Result.Err<string, ValidatorScore>(validatorScoreError.message);
    return Result.Ok<string, ValidatorScore>({ ...validator!, score: validatorScore });
  }

  async getValidatorByAddress(address: Address): Promise<Result<string, Row<"validators">>> {
    const { data, error } = await PostgresClient.client.from("validators").select().eq("address", address);
    return !error
      ? Result.Ok<string, Row<"validators">>(data[0]!)
      : Result.Err<string, Row<"validators">>(error.message);
  }

  async getTrackedValidators(): Promise<Result<string, Row<"validators">[]>> {
    const { data, error } = await PostgresClient.client.from("validators").select().eq("tracked", true);
    return !error
      ? Result.Ok<string, Row<"validators">[]>(data)
      : Result.Err<string, Row<"validators">[]>(error.message);
  }

  async getValidators(): Promise<Result<string, BasicValidator[]>> {
    const { data: validators, error: validatorsError } = await PostgresClient.client
      .from("validators").select(`
        address,
        name,
        updated_at,
        validator_score (
          score
        )
      `).eq("tracked", true);

    if (validatorsError) return Result.Err<string, BasicValidator[]>(validatorsError.message);
    return Result.Ok<string, BasicValidator[]>(validators.map(v => ({ address: v.address, name: v.name, score: (v.validator_score as { score: number })?.score || 0, updated_at: v.updated_at })));
  }

  async getValidatorScore(address: Address): Promise<Result<string, ValidatorScore>> {
    const { data: validators, error: validatorsError } = await PostgresClient.client
      .from("validators").select(`
        address,
        name,
        updated_at,
        validator_score (
          score,
          score_age,
          score_size,
          score_uptime,
          computed_at
        )
      `).eq("address", address).eq("tracked", true).single();

    if (validatorsError) return Result.Err<string, ValidatorScore>(validatorsError.message);
    return Result.Ok<string, ValidatorScore>(validators!);
  }

  async getEventsByValidator(address: Address): Promise<Result<string, Event[]>> {
    const { data: validatorId, error: validatorError } = await PostgresClient.client.from("validators").select("id").eq("address", address).single();
    if (validatorError) return Result.Err<string, Event[]>(validatorError.message);

    const { data: events, error: eventsError } = await PostgresClient.client
      .from("events_validators").select(`
        hash,
        timestamp,
        event_id,
        validator_id,
        events (
          name
        )
      `).eq("validator_id", validatorId.id).order("timestamp", { ascending: true });

    if (eventsError) return Result.Err<string, Event[]>(eventsError.message);
    return Result.Ok<string, Event[]>(events.map(e => ({
      event: (e.events as { name: EventName }).name!,
      hash: e.hash,
      timestamp: e.timestamp,
      event_id: e.event_id,
      validator_id: e.validator_id,
      validator: address,
    })));
  }

  async getEventByName(name: EventName): Promise<Result<string, Row<"events">>> {
    const { data, error } = await PostgresClient.client.from("events").select().eq("name", name);
    return !error
      ? Result.Ok<string, Row<"events">>(data[0]!)
      : Result.Err<string, Row<"events">>(error.message);
  }

  async insertValidatorEvent(event: Event): Promise<Result<string, Row<"events_validators">>> {
    const row: Insert<"events_validators"> = {
      event_id: event.event_id,
      validator_id: event.validator_id,
      hash: event.hash,
      timestamp: event.timestamp,
    }
    const { data, error } = await PostgresClient.client.from("events_validators").insert(row).select().single();
    return !error
      ? Result.Ok<string, Row<"events_validators">>(data)
      : Result.Err<string, Row<"events_validators">>(error.message);
  }

  /**
   * Just for testing
   * Delete all rows from the tables "events_validators" and "validators"
   */
  async flush() {
    await PostgresClient.client.from("events_validators").delete().neq("id", 0)
    await PostgresClient.client.from("validators_score").delete().neq("id", 0)
  }
}
