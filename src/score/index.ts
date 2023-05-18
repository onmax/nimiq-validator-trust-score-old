import { Option, Result } from "ftld";
import RpcClient, { Address } from "nimiq-rpc-client-ts";
import { Validator } from "../database/client";
import { Event, Score } from "../types";
import { getA } from "./age";
import { getS } from "./size";
import { getU } from "./uptime";

let genesisTimestamp: Date;
async function getGenesisTimestamp(rpc: RpcClient): Promise<Option<Date>> {
    if (genesisTimestamp) return Option.Some(genesisTimestamp);

    const { data, error } = await rpc.block.getByNumber(0);
    if (error) return Option.None();

    genesisTimestamp = new Date(data!.timestamp);
    return Option.Some(genesisTimestamp);
}


export async function getScore(rpc: RpcClient, { address, genesis }: Validator, events: Event[]): Promise<Result<string, Score>> {
    const creationEvent = events.find(({ event }) => event === "create-validator");
    if (!genesis && !creationEvent) return Result.Err<string, Score>("Could not find creation event");
    if (genesis && creationEvent) {
        console.warn(`Found creation event for genesis validator ${address}. Ignoring the fact that in the database it is marked as genesis in the database`);
    }
    if (genesis && !creationEvent) {
        const timestamp = await getGenesisTimestamp(rpc);
        if (timestamp.isNone()) return Result.Err<string, Score>("Could not find genesis timestamp");

        events.push({
            event: "create-validator",
            event_id: 0,
            validator: address,
            validator_id: 0,
            hash: "",
            timestamp: timestamp.unwrap().toISOString(),
            genesis: true
        });
    }

    const S = await getS(rpc, address as Address);
    if (S.isErr()) return Result.Err<string, Score>(`Error computing parameter S. ${address}: ${S.unwrapErr()}`);

    const A = await getA(events);
    if (A.isErr()) return Result.Err<string, Score>(`Error computing parameter A. ${address}: ${A.unwrapErr()}`);

    const U = await getU(rpc, events);
    if (U.isErr()) return Result.Err<string, Score>(`Error computing parameter U. ${address}: ${U.unwrapErr()}`);

    const T = S.unwrap() * A.unwrap() * U.unwrap();
    return Result.Ok<string, Score>({
        score: T,
        score_size: S.unwrap(),
        score_age: A.unwrap(),
        score_uptime: U.unwrap()
    });
}
