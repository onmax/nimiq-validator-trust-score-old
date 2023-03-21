import { Transaction } from "nimiq-rpc-client-ts";

enum TransactionType {
	// STAKING CONTRACT INCOMING TRANSACTIONS - VALIDATOR
	CreateValidator = "create-validator",
	UpdateValidator = "update-validator",
	InactivateValidator = "inactivate-validator",
	ReactivateValidator = "reactivate-validator",
	UnparkValidator = "unpark-validator",

	// STAKING CONTRACT INCOMING TRANSACTIONS - STAKER
	CreateStaker = "create-staker",
	Stake = "stake",
	UpdateStaker = "update-staker",
	
	// STAKING CONTRACT OUTGOING TRANSACTIONS - VALIDATOR
	DeleteValidator = "delete-validator",
	
	// STAKING CONTRACT OUTGOING TRANSACTIONS - STAKER
	Unstake = "unstake",

    PayFee = "pay-fee",
	Transfer = "transfer",
	HTLCCreate = "htlc-create",
	HTCCTimeoutResolve = "htlc-timeout-resolve",
	HTLCRegularTransfer = "htlc-regular-transfer",
	HTLCEarlyResolve = "htlc-early-resolve",
	VestingCreate = "vesting-create",
	UpdateValidatorFee = "update-validator-fee",
	PayoutReward = "payout-reward",
	Park = "park",
	Slash = "slash",
	RevertContract = "revert-contract",
	FailedTransaction = "failed-transaction",
}

const IncomingStakingTransactionType = {
	[TransactionType.CreateValidator]: "00",
	[TransactionType.UpdateValidator]: "01",
	[TransactionType.InactivateValidator]: "02",
	[TransactionType.ReactivateValidator]: "03",
	[TransactionType.UnparkValidator]: "04",
	[TransactionType.CreateStaker]: "05",
	[TransactionType.Stake]: "06",
	[TransactionType.UpdateStaker]: "07",
}

const SIGNATURE_PROOF_SIZE = 64;
const STAKING_CONTRACT_ADDRESS = 'NQ77 0000 0000 0000 0000 0000 0000 0000 0001';

export function decodeTransactionData(tx: Transaction) {
	console.log('tx', tx)
	if (tx.to === STAKING_CONTRACT_ADDRESS) {
		return decodeIncomingTxStakingContract(tx);
	} else if ((tx.from === STAKING_CONTRACT_ADDRESS)) {
		return decodeOutgoingTxStakingContract(tx);
	} else {
		// extended txs, cashlink, txs
		console.log('not staking tx')
	}
    
}

function decodeIncomingTxStakingContract({data}: Transaction) {
	const prefix = data.slice(0, 2)
	let address, signature: string
	switch (prefix) {
		// case TransactionType.CreateValidator:
		// 	return decodeCreateValidator(payload);
		// case TransactionType.UpdateValidator:
		// 	return decodeUpdateValidator(payload);
		case IncomingStakingTransactionType[TransactionType.InactivateValidator]:
			[address, signature] = slice(data, [[2,42], [42, 192]])
			return { type: TransactionType.InactivateValidator, address, signature };
		// case TransactionType.ReactivateValidator:
		// 	return decodeReactivateValidator(payload);
		case IncomingStakingTransactionType[TransactionType.UnparkValidator]:
			[address, signature] = slice(data, [[2,42], [42, 192]])
			return { type: TransactionType.UnparkValidator, address, signature };
		// case TransactionType.CreateStaker:
		// 	return decodeCreateStaker(payload);
		// case TransactionType.Stake:
		// 	return decodeStake(payload);
		// case TransactionType.UpdateStaker:
		// 	return decodeUpdateStaker(payload);
		default:
			throw new Error(`Unknown transaction type: ${prefix}`);
	}
}

function decodeOutgoingTxStakingContract({data}: Transaction) {
	const prefix = data.slice(0, 2)
	switch (prefix) {
		// case TransactionType.CreateValidator:
		// 	return decodeCreateValidator(payload);
		// case TransactionType.UpdateValidator:
		// 	return decodeUpdateValidator(payload);
		// case TransactionType.InactivateValidator:
		// 	return decodeInactivateValidator(payload);
		// case TransactionType.ReactivateValidator:
		// 	return decodeReactivateValidator(payload);
		case IncomingStakingTransactionType[TransactionType.UnparkValidator]:
			const [address, signature] = slice(data, [[2,42], [42, 192]])
			return { type: TransactionType.UnparkValidator, address, signature };
		// case TransactionType.CreateStaker:
		// 	return decodeCreateStaker(payload);
		// case TransactionType.Stake:
		// 	return decodeStake(payload);
		// case TransactionType.UpdateStaker:
		// 	return decodeUpdateStaker(payload);
		default:
			throw new Error(`Unknown transaction type: ${prefix}`);
	}
}

function slice(data: string, ranges: [number, number][]) {
	const result = [];
	for (const [start, end] of ranges) {
		result.push(data.slice(start, end));
	}
	return result;
}

function hex2Bytes(text: string): BufferSource | undefined {
    const s = decodeURI(encodeURIComponent(text));
    const uintArray = new Uint8Array(s.length);

    for (let i = 0; i < s.length; i++) {
        uintArray[i] = s.charCodeAt(i);
    }

    return uintArray.buffer;
}