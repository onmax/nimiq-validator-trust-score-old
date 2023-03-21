import { Address, Client as RpcClient, type MacroBlock, type Slot, type BlockNumber, EpochIndex } from "nimiq-rpc-client-ts";
import { Timeline as TimelineTable } from "./redis/timeline";

/**
 * The retriever has the responsability of fetching all the required data from the RPC node, 
 * calculating the score of every validator in every batch and storing it in redis
 * 
 * There are two modes of operation:
 *   1. Retrieving old data via RPC single calls: It goes from a range of macroblocks and fetches
 *      the data of every batch in that range. It is used to fill the redis database with old data
 *      when the service starts/restarts. See function fillBatchScoreRepository.
 *   2. Retrieving new data via RPC subscriptions: It subscribes to new macroblocks and fetches the data
 *      of the previous batch. It is used to keep the redis database up to date. TODO.
 * 
 * This is how it is being calculated:
 *  1. Fetchs the macroblock N (currentMacroBlock) and the macroblock N+1 (nextMacroBlock)
 *  2. TODO
 * 
 */

export class TimelineRetriever {
    private rpc: RpcClient
    private redis: TimelineTable

    constructor({rpc, redis}: { rpc: RpcClient, redis: TimelineTable }) {
        this.rpc = rpc
        this.redis = redis
    }

    // async fillEpochScoreRepository(ranges: [BlockNumber, BlockNumber]) {
    //     await this.redis.init()

    //     if (ranges[0] > ranges[1]) throw new Error("Start block number is greater than end block number")
    
    //     const [startBlock, endBlock] = ranges
    
    //     const currentBatchNumber = await this.rpc.block.macro.last({ blockNumber: startBlock })
    //     let currentMacroBlock = await this.rpc.block.by({blockNumber: currentBatchNumber, includeTransactions: true}) as MacroBlock
    //     const lastMacroBlockNumber = await this.rpc.block.macro.last({ blockNumber: endBlock })
    
    //     const batchSize = await (this.rpc.constant.params().then(({blocksPerBatch}) => blocksPerBatch))
    
    //     while (currentMacroBlock.number < lastMacroBlockNumber) {
    //         const nextMacroBlock = await this.rpc.block.by({blockNumber: currentMacroBlock.number + batchSize, includeTransactions: true}) as MacroBlock
    //         await this.handleBatch(currentMacroBlock, nextMacroBlock)
    //         currentMacroBlock = nextMacroBlock
    //     }
    // }
    
    // private async handleBatch(currentMacroBlock: MacroBlock, nextMacroBlock: MacroBlock) {
    //     const batchScores = await this.getBatchScores(currentMacroBlock.slots, nextMacroBlock.lostRewardSet)
    //     batchScores.forEach(async ({address, score}) => {
    //         await this.redis.add(address, currentMacroBlock.number, score)
    //     })
    // }
    
    // private async getBatchScores(slots: Slot[], lostRewardsSet: number[]): Promise<{ address: Address, score: number }[]> {
    //     return slots.map(slot => {
    //         const { validator: address, firstSlotNumber: firstSlot, numSlots } = slot
    //         const lastSlot = firstSlot + numSlots - 1
    //         const slotsMissed = lostRewardsSet.filter(slotNumber => firstSlot <= slotNumber && slotNumber <= lastSlot).length
    //         const score = (numSlots - slotsMissed) / slotsMissed
    
    //         return {
    //             address,
    //             score
    //         }
    //     })
    // }

    // async fillEpochScoreRepository(ranges: [EpochIndex, EpochIndex]) {
    //     await this.redis.init()

    //     if (ranges[0] > ranges[1]) throw new Error("Start block number is greater than end block number")
    
    //     const [startBlock, endBlock] = ranges
    
    //     const currentBatchNumber = await this.rpc.block.macro.last({ blockNumber: startBlock })
    //     let currentMacroBlock = await this.rpc.block.by({blockNumber: currentBatchNumber, includeTransactions: true}) as MacroBlock
    //     const lastMacroBlockNumber = await this.rpc.block.macro.last({ blockNumber: endBlock })
    
    //     const batchSize = await (this.rpc.constant.params().then(({blocksPerBatch}) => blocksPerBatch))
    // }

    
}