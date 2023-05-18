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
      if (error) return Result.Err(error.message);
      return Result.Ok(data!);
    } else {
      return Result.Ok(validator!);
    }
  }

  async insertScore(address: Address, score: Score): Promise<Result<string, ValidatorScore>> {
    const { data: validator, error: validatorError } = await PostgresClient.client.from("validators").select().eq("address", address).single();
    if (validatorError) return Result.Err(validatorError.message);

    if (!validator.tracked) {
      return Result.Err(`Validator ${address} is not tracked`);
    }

    const { data: validatorScore, error: validatorScoreError } = await PostgresClient.client.from("validator_score")
      .upsert({ validator: validator.id, ...score }, { onConflict: 'validator' }).select().single();
    if (validatorScoreError) return Result.Err(validatorScoreError.message);
    return Result.Ok({ ...validator!, score: validatorScore });
  }

  async getValidatorByAddress(address: Address): Promise<Result<string, Row<"validators">>> {
    const { data, error } = await PostgresClient.client.from("validators").select().eq("address", address);
    return !error
      ? Result.Ok(data[0]!)
      : Result.Err(error.message);
  }

  async getTrackedValidators(): Promise<Result<string, Row<"validators">[]>> {
    const { data, error } = await PostgresClient.client.from("validators").select().eq("tracked", true);
    return !error
      ? Result.Ok(data)
      : Result.Err(error.message);
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

    if (validatorsError) return Result.Err(validatorsError.message);
    return Result.Ok(validators!.map(v => {
      return {
        address: v.address,
        name: v.name,
        updated_at: v.updated_at,
        score: (v.validator_score as { score: number })?.score || 0,
      }
    }));
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

    if (validatorsError) return Result.Err(validatorsError.message);
    return Result.Ok(validators!);
  }

  async getEventsByValidator(address: Address): Promise<Result<string, Event[]>> {
    const { data: validatorId, error: validatorError } = await PostgresClient.client.from("validators").select("id").eq("address", address).single();
    if (validatorError) return Result.Err(validatorError.message);

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

    if (eventsError) return Result.Err(eventsError.message);
    return Result.Ok(events!.map(e => {
      return {
        event: (e.events as { name: EventName }).name,
        event_id: e.event_id,
        validator: address,
        validator_id: e.validator_id,
        hash: e.hash,
        timestamp: e.timestamp,
      }
    }
    ));
  }

  async getEventByName(name: EventName): Promise<Result<string, Row<"events">>> {
    const { data, error } = await PostgresClient.client.from("events").select().eq("name", name);
    return !error
      ? Result.Ok(data[0]!)
      : Result.Err(error.message);
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
      ? Result.Ok(data)
      : Result.Err(error.message);
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
