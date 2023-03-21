// import { Transaction } from "nimiq-rpc-client-ts";

// enum TransactionType {
//     BASIC = 'basic',
//     EXTENDED = 'extended',
//     CREATE_VALIDATOR = 'create-validator',
//     UPDATE_VALIDATOR = 'update-validator',
//     INACTIVATE_VALIDATOR = 'inactivate-validator',
//     REACTIVATE_VALIDATOR = 'reactivate-validator',
//     UNPARK_VALIDATOR = 'unpark-validator',
//     NEW_STAKE = 'new-stake',
//     ADD_STAKE = 'add-stake',
//     UPDATE_STAKE = 'update-stake',
//     DROP_VALIDATOR = 'drop-validator',
//     UNSTAKE = 'unstake',
// }

// type ExtendedData = {
//     _parts: DataParts;
//     type: TransactionType.EXTENDED;
//     message?: string;
// }

// type DataParts = [string, string][]; // [name, signature]

// type TransactionData = {
//     _parts: DataParts;
//     type: TransactionType;
// }

// type CreateValidatorData = {
//     _parts: DataParts;
//     type: TransactionType.CREATE_VALIDATOR;
//     validatorKey: string;
//     validatorId: string; 
//     rewardAddress: string;
// }

// type UpdateValidatorData = {
//     _parts: DataParts;
//     type: TransactionType.UPDATE_VALIDATOR;
//     validatorId: string; 
//     oldValidatorKey: string;
//     newValidatorKey?: string;
//     newRewardAddress?: string;
// };

// type InactivateValidatorData = {
//     _parts: DataParts;
//     type: TransactionType.INACTIVATE_VALIDATOR;
//     validatorId: string;
// };

// type ReactivateValidatorData = {
//     _parts: DataParts;
//     type: TransactionType.REACTIVATE_VALIDATOR;
//     validatorId: string;
// };

// type UnparkValidatorData = {
//     _parts: DataParts;
//     type: TransactionType.UNPARK_VALIDATOR;
//     validatorId: string;
// };

// type NewStakeData = {
//     _parts: DataParts;
//     type: TransactionType.NEW_STAKE
//     validatorId: string;
//     stakerAddress?: string;
// };

// type AddStakeData = {
//     _parts: DataParts;
//     type: TransactionType.ADD_STAKE
//     stakerAddress: string;
// };

// type UpdateStakeData = {
//     _parts: DataParts;
//     type: TransactionType.UPDATE_STAKE;
//     newValidatorId: string;
// };

// type DropValidatorProof = {
//     _parts: DataParts;
//     type: TransactionType.DROP_VALIDATOR;
//     validatorId: string;
// };

// type UnstakeStakeProof = {
//     _parts: DataParts;
//     type: TransactionType.UNSTAKE;
// };

// type SignatureProof = {
//     _parts: DataParts;
//     type: TransactionType.BASIC;
// }

// type TransactionProof = SignatureProof | DropValidatorProof | UnstakeStakeProof;

// const SIGNATURE_PROOF_SIZE = 64;

// const STAKING_CONTRACT_ADDRESS = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0001';

// export function decodeTransactionData(tx: Transaction): TransactionData | null {
// 	const { data } = tx;

// 	if (tx.to !== STAKING_CONTRACT_ADDRESS) {
// 		const _parts: DataParts = [];

// 		// TODO: Detect cashlink txs
// 		// TODO: Detect swap proxy txs

// 		const textDecoder = new TextDecoder('utf-8', { fatal: true });
// 		let message: string | undefined;
// 		try {
// 			message = textDecoder.decode(hex2Bytes(data));
// 		} catch (error) {
// 			// Ignore
// 		}
// 		_parts.push(['Data', data]);

// 		const result: ExtendedData = {
// 			_parts,
// 			type: TransactionType.EXTENDED,
// 			message,
// 		};
// 		return result;
// 	}

// 	// IncomingStakingTransaction
// 	if (tx.from !== STAKING_CONTRACT_ADDRESS) {
// 		/**
// 		 * Create Validator
// 		 */
// 		if (data.startsWith('00')) {
// 			const _parts: DataParts = [];

// 			// Type
// 			const type = TransactionType.CREATE_VALIDATOR;
// 			_parts.push(['Type', data.substr(0, 2)]);

// 			// Validator Public Key
// 			const validatorKey = data.substr(2, 570); // 285 bytes
// 			_parts.push(['Validator Key', validatorKey]);

// 			// Proof of Knowledge (Validator Signature)
// 			const signature = data.substr(572, 190); // 95 bytes
// 			_parts.push(['Knowledge Proof', signature]);

// 			// Reward Address
// 			const rewardAddress = data.substr(762, 40); // 20 bytes
// 			_parts.push(['Reward Address', rewardAddress]);

// 			// Validator ID
// 			const validatorId = tx.hash.substr(0, 40); // 20 bytes

// 			const result: CreateValidatorData = {
// 				_parts,
// 				type,
// 				validatorKey,
// 				validatorId,
// 				rewardAddress,
// 			};
// 			return result;
// 		}

// 		/**
// 		 * Update Validator
// 		 */
// 		if (data.startsWith('01')) {
// 			const _parts: DataParts = [];
// 			let readPos = 0;

// 			// Type
// 			const type = TransactionType.UPDATE_VALIDATOR;
// 			_parts.push(['Type', data.substr(0, 2)]);
// 			readPos += 2;
// ​
// 			// Validator ID
// 			const validatorId = data.substr(readPos, 40); // 20 bytes
// 			_parts.push(['Validator ID', validatorId]);
// 			readPos += 40;
// ​
// 			// Validator Public Key
// 			const oldValidatorKey = data.substr(readPos, 570); // 285 bytes
// 			_parts.push(['Old Validator Key', oldValidatorKey]);
// 			readPos += 570;
// ​
// 			const updatesKey = data.substr(readPos, 2); // 1 byte
// 			_parts.push(['Updates Key', updatesKey]);
// 			readPos += 2;
// ​
// 			const updatesAddress = data.substr(readPos, 2); // 1 byte
// 			_parts.push(['Updates Address', updatesAddress]);
// 			readPos += 2;
// ​
// 			let newValidatorKey: string | undefined;
// 			let newRewardAddress: string | undefined;
// ​
// 			if (updatesKey === '01') {
// 				// Validator Public Key
// 				const newValidatorKey = data.substr(readPos, 570); // 285 bytes
// 				_parts.push(['New Validator Key', newValidatorKey]);
// 				readPos += 570;
// ​
// 				// Proof of Knowledge (Validator Signature)
// 				const signature = data.substr(readPos, 190); // 95 bytes
// 				_parts.push(['Knowledge Proof', signature]);
// 				readPos += 190;
// 			}
// ​
// 			if (updatesAddress === '01') {
// 				// Reward Address
// 				newRewardAddress = data.substr(readPos, 40); // 20 bytes
// 				_parts.push(['Reward Address', newRewardAddress]);
// 				readPos += 40;
// 			}
// ​
// 			// Validator Signature
// 			const signature = data.substr(readPos, 190); // 95 bytes
// 			_parts.push(['BLS Signature', signature]);
// ​
// 			const result: UpdateValidatorData = {
// 				_parts,
// 				type,
// 				validatorId,
// 				oldValidatorKey,
// 				newValidatorKey,
// 				newRewardAddress,
// 			};
// 			return result;
// 		}
// ​
// 		/**
// 		 * Inactivate Validator
// 		 */
// 		if (data.startsWith('02')) {
// 			const _parts: DataParts = [];
// ​
// 			// Type
// 			const type = TransactionType.INACTIVATE_VALIDATOR;
// 			_parts.push(['Type', data.substr(0, 2)]);
// ​
// 			// Validator ID
// 			const validatorId = data.substr(2, 40); // 20 bytes
// 			_parts.push(['Validator ID', validatorId]);
// ​
// 			// Validator Signature
// 			const signature = data.substr(42, 190); // 95 bytes
// 			_parts.push(['BLS Signature', signature]);
// ​
// 			const result: InactivateValidatorData = {
// 				_parts,
// 				type,
// 				validatorId,
// 			};
// 			return result;
// 		}
// ​
// 		/**
// 		 * Reactivate Validator
// 		 */
// 		if (data.startsWith('03')) {
// 			const _parts: DataParts = [];
// ​
// 			// Type
// 			const type = TransactionType.REACTIVATE_VALIDATOR;
// 			_parts.push(['Type', data.substr(0, 2)]);
// ​
// 			// Validator ID
// 			const validatorId = data.substr(2, 40); // 20 bytes
// 			_parts.push(['Validator ID', validatorId]);
// ​
// 			// Validator Signature
// 			const signature = data.substr(42, 190); // 95 bytes
// 			_parts.push(['BLS Signature', signature]);
// ​
// 			const result: ReactivateValidatorData = {
// 				_parts,
// 				type,
// 				validatorId,
// 			};
// 			return result;
// 		}
// ​
// 		/**
// 		 * Unpark Validator
// 		 */
// 		if (data.startsWith('04')) {
// 			const _parts: DataParts = [];
// ​
// 			// Type
// 			const type = TransactionType.UNPARK_VALIDATOR;
// 			_parts.push(['Type', data.substr(0, 2)]);
// ​
// 			// Validator ID
// 			const validatorId = data.substr(2, 40); // 20 bytes
// 			_parts.push(['Validator ID', validatorId]);
// ​
// 			// Validator Signature
// 			const signature = data.substr(42, 190); // 95 bytes
// 			_parts.push(['BLS Signature', signature]);
// ​
// 			const result: UnparkValidatorData = {
// 				_parts,
// 				type,
// 				validatorId,
// 			};
// 			return result;
// 		}
// ​
// 		/**
// 		 * New Stake
// 		 */
// 		if (data.startsWith('05')) {
// 			const _parts: DataParts = [];
// ​
// 			// Type
// 			const type = TransactionType.NEW_STAKE;
// 			_parts.push(['Type', data.substr(0, 2)]);
// ​
// 			// Validator ID
// 			const validatorId = data.substr(2, 40); // 20 bytes
// 			_parts.push(['Validator ID', validatorId]);
// ​
// 			// Staker address (optional)
// 			const stakerAddressRaw = data.substr(42, 40); // 1 null byte or 20 bytes
// 			_parts.push(['Staker Address', stakerAddressRaw]);
// 			// TODO: Convert to userfriendly address
// 			const stakerAddress = stakerAddressRaw === '00' ? undefined : stakerAddressRaw;
// ​
// 			const result: NewStakeData = {
// 				_parts,
// 				type,
// 				validatorId,
// 				stakerAddress,
// 			};
// 			return result;
// 		}
// ​
// 		/**
// 		 * Add Stake
// 		 */
// 		if (data.startsWith('06')) {
// 			const _parts: DataParts = [];
// ​
// 			// Type
// 			const type = TransactionType.ADD_STAKE;
// 			_parts.push(['Type', data.substring(0, 2)]);
// ​
// 			// Staker address
// 			const stakerAddress = data.substr(2, 40); // 20 bytes
// 			_parts.push(['Staker Address', stakerAddress]);

// 			const result: AddStakeData = {
// 				_parts,
// 				type,
// 				stakerAddress,
// 			};
// 			return result;
// 		}

// 		/**
// 		 * Update Stake
// 		 */
// 		if (data.startsWith('07')) {
// 			const _parts: DataParts = [];

// 			// Type
// 			const type = TransactionType.UPDATE_STAKE;
// 			_parts.push(['Type', data.substr(0, 2)]);

// 			// New validator ID
// 			const newValidatorId = data.substr(2, 40); // 20 bytes
// 			_parts.push(['New Validator ID', newValidatorId]);

// 			const result: UpdateStakeData = {
// 				_parts,
// 				type,
// 				newValidatorId,
// 			};
// 			return result;
// 		}
// 	}

// 	throw new Error('Unhandled transaction data!');
// }

// function decodeSignatureProof(proof: string, parts: DataParts): void;
// function decodeSignatureProof(proof: string): DataParts;
// function decodeSignatureProof(proof: string, parts?: DataParts): DataParts | void {
// 	const returnParts = !parts;
// 	if (!parts) parts = [];

// 	// Public Key
// 	const publicKey = proof.substr(0, 62);
// 	parts.push(['Public Key', publicKey]);

// 	// Merkle Path
// 	// TODO: Handle merkle paths of any size
// 	const merklePath = proof.substr(64, 2);
// 	parts.push(['Merkle Path', merklePath]);

// 	// Signature
// 	const signature = proof.substr(66, 128);
// 	parts.push(['Signature', signature]);

// 	if (returnParts) return parts;
// }

// export function decodeTransactionProof(tx: Transaction): TransactionProof | null {
// 	const { proof } = tx;

// 	// SingleSignatureProof
// 	if (proof.length === SIGNATURE_PROOF_SIZE) {
// 		const _parts = decodeSignatureProof(proof);

// 		// Type
// 		const type = TransactionType.BASIC;

// 		const result: SignatureProof = {
// 			_parts,
// 			type,
// 		};
// 		return result;
// 	}

// 	// OutgoingStakingTransaction
// 	if (tx.from === STAKING_CONTRACT_ADDRESS && tx.to !== STAKING_CONTRACT_ADDRESS) {
// 		/**
// 		 * Drop Validator
// 		 */
// 		if (proof.startsWith('00')) {
// 			const _parts: DataParts = [];

// 			// Type
// 			const type = TransactionType.DROP_VALIDATOR;
// 			_parts.push(['Type', proof.substr(0, 2)]);

// 			// Validator ID
// 			const validatorId = proof.substr(2, 40); // 20 bytes
// 			_parts.push(['Validator ID', validatorId]);

// 			// Validator Public Key
// 			const validatorKey = proof.substr(42, 570); // 285 bytes
// 			_parts.push(['Validator Key', validatorKey]);

// 			// Validator Signature
// 			const signature = proof.substr(42, 190); // 95 bytes
// 			_parts.push(['BLS Signature', signature]);

// 			const result: DropValidatorProof = {
// 				_parts,
// 				type,
// 				validatorId,
// 			};
// 			return result;
// 		}

// 		/**
// 		 * Unstake
// 		 */
// 		if (proof.startsWith('05')) {
// 			const _parts: [string, string][] = [];

// 			// Type
// 			const type = TransactionType.UNSTAKE;
// 			_parts.push(['Type', proof.substr(0, 2)]);

// 			decodeSignatureProof(proof.substr(2, SIGNATURE_PROOF_SIZE), _parts);

// 			const result: UnstakeStakeProof = {
// 				_parts,
// 				type,
// 			};
// 			return result;
// 		}
// 	}

// 	return null;
// }
