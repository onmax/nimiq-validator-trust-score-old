import { parseTxData } from "albatross-util-wasm";
import { Option, Result } from "ftld";
import RpcClient, { Address, LogType, Transaction } from "nimiq-rpc-client-ts";
import PostgresClient, { Validator } from "./database/client";
import { getScore } from "./score";
import { Event, EventName } from "./types";


export function upperCamelCaseToKebab(str: string) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export class EventsFetcher {
    rpc: RpcClient;
    db: PostgresClient;
    stakingContract: Address | undefined;
    events = ["create-validator", "deactivate-validator", "reactivate-validator", "retire-validator", "delete-validator"] as const;

    close: () => void = () => { };

    constructor(rpc: RpcClient, db: PostgresClient) {
        this.rpc = rpc;
        this.db = db;
    }

    async insertOldEvents(): Promise<Result<string, boolean>> {
        const trackedValidators = await this.db.getTrackedValidators()
        if (trackedValidators.isErr()) return Result.Err<string, boolean>(trackedValidators.unwrapErr())


        await Promise.allSettled(trackedValidators.unwrap().map(async (validator) => {
            const activity = await this.rpc.call<Transaction[]>({ method: "getValidatorTxsByAddress", params: [validator.address] }, { timeout: 100_000_000 })
            if (activity.error) {
                console.error(`Unable to fetch activity for ${validator.address}. Error: ${activity.error.message}`)
                return
            }
            const events = await Promise.all(activity.data.map(tx => this.insertEventToDb(validator, tx)))
            const score = await getScore(this.rpc, validator, events.filter(e => e.isOk()).map(e => e.unwrap()))
            await this.db.insertScore(validator.address as Address, score.unwrap())
        }))

        return Result.Ok<string, boolean>(true)
    }

    /**
     * Streams events from the blockchain and inserts them into the database.
     */
    async streamEvents() {
        const { next, close } = await this.rpc.logs.subscribe({ addresses: [RpcClient.policy.stakingContractAddress], types: this.events as unknown as LogType[] })
        this.close = close;

        next(async (blockLog) => {
            if (blockLog.error) {
                console.error(blockLog.error)
                return
            }

            for (const { failed, hash } of blockLog.data.transactions) {
                if (failed) continue; // Ignore failed transactions

                const { data: tx, error } = await this.rpc.transaction.getByHash(hash)
                if (error) {
                    console.error(error)
                    continue // TODO Add it to the database?
                }

                const fromStakingContract = tx.from === RpcClient.policy.stakingContractAddress
                const validatorAddress = fromStakingContract ? tx.to : tx.from
                const validator = await this.db.insertValidator(validatorAddress)
                if (validator.isErr()) {
                    console.error(validator.unwrapErr())
                    continue
                }
                await this.insertEventToDb(validator.unwrap(), tx);
                const events = await this.db.getEventsByValidator(validatorAddress)
                if (events.isErr()) {
                    console.error(events.unwrapErr())
                    continue
                }
                const score = await getScore(this.rpc, validator.unwrap(), events.unwrap())
                await this.db.insertScore(validatorAddress, score.unwrap())
            }
        })
    }

    private async insertEventToDb(validator: Validator, tx: Transaction): Promise<Result<string, Event>> {
        const fromStakingContract = tx.from === RpcClient.policy.stakingContractAddress
        const eventName = this.getTxEvent(fromStakingContract ? tx.proof : tx.data)
        if (eventName.isNone()) return Result.Err<string, Event>(`Unable to find event for transaction ${tx.hash}`)
        const eventEntity = await this.db.getEventByName(eventName.unwrap())
        if (eventEntity.isErr()) return Result.Err<string, Event>(eventEntity.unwrapErr())
        const event: Event = {
            event: eventName.unwrap(),
            event_id: eventEntity.unwrap().id,
            validator_id: validator.id,
            validator: validator.address,
            hash: tx.hash,
            timestamp: new Date(tx.timestamp).toISOString()
        }
        await this.db.insertValidatorEvent(event)
        return Result.Ok<string, Event>(event)
    }

    async closeStream() {
        this.close()
    }

    private getTxEvent(encoded: string): Option<EventName> {
        if (!encoded) return Option.None()
        try {
            const parsedData = parseTxData(encoded);
            const eventName = upperCamelCaseToKebab(Object.keys(parsedData)[0]) as EventName; // Get the key from the JSON object
            if (this.events.includes(eventName)) {
                return Option.Some(eventName);
            }
        } catch (e) { }

        return Option.None()
    }
}
