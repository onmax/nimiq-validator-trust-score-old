import { Result } from "ftld";
import RpcClient, { EpochIndex } from "nimiq-rpc-client-ts";
import { Event, EventName } from "../types";

// Number of days we want to consider for the score
const UPTIME_DAYS = 30 * 9; // 9 months

// Parameter determing how much the observation of the oldest batch is worth relative to the observation of the newest batch
const A = 0.5;

// Rough estimate of the number of seconds per block
const SECONDS_PER_BLOCK = 1;

// Each number represents a change of status of the validator from "online" to "offline" or viceversa.
//  - Being online means that the validator has been: Created, reactivated, unparked
//  - Being offline means that the validator has been: Deactivated, parked or retired
// Number in the even positions represent the epoch when the validator went online.
// Numbers in the odd positions represent the epoch when the validator went offline.
// First item in the list is the epoch when the validator was created.
type ValidatorActivity = EpochIndex[];
const ONLINE_EVENTS: EventName[] = ["create-validator", "reactivate-validator",]; // TODO "unpark-validator"
const OFFLINE_EVENTS: EventName[] = ["deactivate-validator", "retire-validator"]; // TODO "park-validator"

async function getActivity(rpc: RpcClient, events: Event[]): Promise<Result<string, ValidatorActivity>> {
    const sortedEvents = events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (sortedEvents.findIndex(({ event }) => event === "create-validator") !== 0) return Result.Err("First event must be the creation of the validator");

    const activity: ValidatorActivity = [];
    let validatorOnline: boolean = true;

    for (const event of sortedEvents) {
        const EVENTS_TO_CHECK = validatorOnline ? ONLINE_EVENTS : OFFLINE_EVENTS;
        if (!EVENTS_TO_CHECK.includes(event.event)) continue;

        const epoch = await getEpochByTxEvent(rpc, event);
        if (epoch.isErr()) return Result.Err(epoch.unwrapErr());

        activity.push(epoch.unwrap());

        validatorOnline = !validatorOnline;
    }

    return Result.Ok(activity);
}

async function getEpochByTxEvent(client: RpcClient, event: Event): Promise<Result<string, EpochIndex>> {
    if (event.genesis) return Result.Ok(0);

    const result = await client.transaction.getByHash(event.hash);
    if (result.error) return Result.Err(`${result.context.body.method}: ${result.error.message}`);

    const epoch = await client.epoch.at(result.data!.blockNumber);
    if (epoch.error) return Result.Err(`${epoch.context.body.method}: ${epoch.error.message}`);
    return Result.Ok(epoch.data!);
}

export async function getUptime(rpc: RpcClient, events: Event[]): Promise<Result<string, number>> {
    //
    // 1. We need to find the range of epochs we want to consider for the score.
    //

    const creationEvent = events.find(({ event }) => event === "create-validator");
    if (!creationEvent) return Result.Err("Could not find creation event");

    const currentEpoch = await rpc.epoch.current();
    if (currentEpoch.error) return Result.Err(`${currentEpoch.context.body.method}: ${currentEpoch.error.message}`);

    const now = new Date();
    const creationDate = new Date(creationEvent.timestamp);
    const daysCreated = Math.floor((now.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24));

    let start: number, end: number;
    if (daysCreated < UPTIME_DAYS) {
        if (creationEvent.genesis) {
            [start, end] = [0, currentEpoch.data!]
        } else {
            const epoch = await getEpochByTxEvent(rpc, creationEvent);
            if (epoch.isErr()) return Result.Err(epoch.unwrapErr());
            [start, end] = [epoch.unwrap(), currentEpoch.data!]
        }
    } else {
        // There is no way to fetch an epoch by timestamp, so we roughly estimate it given that a block is created every 1 second
        const { batchesPerEpoch, blocksPerBatch } = RpcClient.policy;
        const blocksPerEpoch = batchesPerEpoch * blocksPerBatch;
        const epochDuration = blocksPerEpoch * SECONDS_PER_BLOCK;
        const epochs = Math.floor(UPTIME_DAYS * 24 * 60 * 60 / epochDuration);
        [start, end] = [Math.max(0, currentEpoch.data! - epochs), currentEpoch.data!]
    }

    //
    // 2. Now, we need to compute the score.
    //
    const activity = await getActivity(rpc, events);
    if (activity.isErr()) return Result.Err(activity.unwrapErr());

    let numerator = 0;
    let denominator = 0;

    // m is the number of epochs we want to consider for the score
    const m = end - start;
    for (let i = 0; i < m; i++) {
        const division = (1 - ((A * i) / (m - 1)));
        const activeInEpochI = activity.unwrap().filter((e) => e === start + i).length % 2 === 1 ? 1 : 0;
        numerator += division * activeInEpochI;
        denominator += division;
    }

    return Result.Ok(numerator / denominator);
}
