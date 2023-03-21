import { Address, Client, Client as RpcClient, Transaction, InactiveValidatorTxParams } from "nimiq-rpc-client-ts"
import * as dotenv from 'dotenv'

type InstanceKey = {address: Address, address_raw: string, public_key: string, private_key: string}
type Validator = { signing_keypair: InstanceKey, address: InstanceKey, reward_address: InstanceKey }

function envs() {
    dotenv.config()
    const NIMIQ_HISTORY_NODE = process.env.NIMIQ_HISTORY_NODE;
    if (!NIMIQ_HISTORY_NODE) throw new Error("NIMIQ_HISTORY_NODE is not set");
    const REDIS_URL = process.env.REDIS_URL
    if (!REDIS_URL) throw new Error("REDIS_URL is not set");

    return {
        historyNode: new URL(NIMIQ_HISTORY_NODE),
        redisUrl: new URL(REDIS_URL)
    }
}

async function registerValidators(client: Client): Promise<Validator[]> {
    console.log("Registering validators")
    const validatorsRaw = `{'address': 'NQ22 2NMB RC3S F05B HNFD V03H 4X0A 3CC7 KE6N', 'address_raw': '15aabcb07a780ab8d9ede80712780a1b1879b8d6', 'public_key': '40cd04e7118cbf7a71e300e5e284581e7e5c6ef3892e052e9c95c9490943af44', 'private_key': '70410d7523abb771dd691433562c7090c6933b604bc97a6001e02c9805bbe319'}
    {'address': 'NQ12 SE3C GXDY UKD9 VR8B R54R 9B4U TVFG URR6', 'address_raw': 'd386c879bfe4da9ee50bc94994ac9cdf5f0e6726', 'public_key': 'cbcc0414b056f3c08eed290216837faf90d5a2755dbf6bc539f237da149526b7', 'private_key': 'a9f9d052a8803eb924912f153a41e5e170a01d85f6f3d5a43f07a48db30d40ff'}
    {'address': 'NQ71 6B99 0VH8 MCY3 ACSJ 40C7 FYJX 433V AAH1', 'address_raw': '32d2907628ab3e353352201877fe5e20c7d52a21', 'public_key': '01d701a96cf2bd82a32cbd8af845561d3afb01752680e6b09f04283c61192b67', 'private_key': '003c1a94940628ea5812e7bee1b866c3f97d40594529696785926acc344816ba'}
    {'address': 'NQ33 KVF6 M065 LMBY 6E7B L3RL G023 UDC4 0SS4', 'address_raw': '9f5e6a80c5a557f338eba0f3480043e358406b44', 'public_key': '3e814f608b1fb836c6b3ff349039fb7d81077aedff3bdc4b059d5f720ef931e6', 'private_key': '90bade9f01857a9fb45ba774b13db0b0f26e5df2c86bf7bed097c8d3780d8654'}
    {'address': 'NQ44 APQ7 6FD8 MR4T RHTG M4E1 7L6U 2XNM XYVG', 'address_raw': '55f0733da8ae49bcc770a91c13d0dc17ad5f7fb0', 'public_key': '2edbc8810469fba73a0aaeba90e6bcb408d826d27c8008d2743c5d6c24827b8b', 'private_key': '82e6569aa065f9a348112b2f5cb5d4841137f60f0339d4e89a2c6f23d8394519'}
    {'address': 'NQ89 55ET APGF FQVR K40G XTM2 T43A HM1Y ET00', 'address_raw': '295db55e0f7e3b999010f6ea2d906a8d43f76c00', 'public_key': '94cf1c1d505d2031f521afe573b68c2afe94daaeb1000a505faf7faabcd507a3', 'private_key': '9d514a5c56c643656234a01c035c423280df319a59935de83dced9ad1539471e'}
    {'address': 'NQ95 UQA7 U30S 96H0 8M9N XAH8 22PA KCXS H5EX', 'address_raw': 'e6147e0c1a49a2045536f2a2810aea9b3da895de', 'public_key': '6f1e5ae539e939c9c2dcda6e7b2a9789a8491d809d10bdc71cfe17d0a85d3ee0', 'private_key': '373ab2a0912537615ebae36a89ede58646867acb05ad3d00194ac3acf297ba0a'}
    {'address': 'NQ61 T831 2JYF Y4CE LTUM Y2QH HSCE 5PFQ M4LP', 'address_raw': 'da06114beff918ea6f95f8b118e98e2ddf8a9297', 'public_key': '6f47db7bf9fa5de63942fb5b543e95dafb7a49608fe2640be78b0550cf0b34a6', 'private_key': 'e3f91f41b9af58ff477874bad2ebcf51b4ca0a2eff4acdd774e960af8b026b4a'}
    {'address': 'NQ34 Q997 R0KC 4HGL JTVC V160 SA6N 3G38 CAS5', 'address_raw': 'c2527c826c2461496face84c0d28d61c06862b45', 'public_key': '8524bbe40b02cdf4fb5472a359f706606b95abc7b70c9aa7fd80c7d736e0453f', 'private_key': 'acb7bef320fce0210088230614dee199e50d1873f93a91e8403baa75bd2224f6'}
    {'address': 'NQ89 V751 1HFG D5NS APL5 J725 4LTJ 0NK8 7CSV', 'address_raw': 'e9ca10c5f0696da55e8591c452537205a683b35d', 'public_key': '5f165a5b83ba3df16d99fe1f3b9a3d3995a549c56d03187e7afd0f7cf7cd6edb', 'private_key': '2fed0eefda8803bed0fcd4330a01dddb96b1fdbe3d0aa37795b7939a1a2fee0d'}
    {'address': 'NQ43 JD07 JEFN BAUS LRSA 5UQY GK92 UXAM E147', 'address_raw': '93407939f65ab9aa674a2f31f84d22e795570487', 'public_key': '4c6e7ddcf2cb3be0a6716655584c4cd1574c2d414ff9de9f4d6091ee75ed0697', 'private_key': '6a38b1541654248714b3173ec30006c6ef9de2a355ef68737d2dc73dd7b82f7b'}
    {'address': 'NQ27 Q3KB F8CF 9873 S99B 61CX LNC4 P9K0 6YTR', 'address_raw': 'c0e6b7a18f4a0e3d252b3059ea5984ba66037f79', 'public_key': 'ec81beaf801104237bdfd50e40da9583647216b1a3ed2b645ce1bda6d0add8d8', 'private_key': '3b7bfde0e71857f1af4be4e33f575f08964e6c085f15ecaf4c59d72afff95a00'}`

    
    const keys = validatorsRaw.split('\n')
    .map(v => v.replace(/'/g, '"'))
    .map(v => JSON.parse(v)) as InstanceKey[];
    
    if(keys.length % 3 !== 0) throw new Error('Invalid number of keys. Should be multiple of 3: signing_keypair, address, and the reward_address');

    keys.forEach(async (v) => {
        const importKey = await client.account.importRawKey({keyData: v.private_key});
        if (importKey.error) throw new Error(importKey.error.message);
        const unlocked = await client.account.unlock({address: v.address});
        if (unlocked.error) throw new Error(unlocked.error.message);
    })

    const list = (await client.account.list()).data!;    
    console.log(`List of accounts: ${list.length}`)
    console.log(list)
    console.log('\n\n\n')

    return keys.map((v, i) => {
        if(i % 3 === 0) {
            return {
                signing_keypair: v,
                address: keys[i + 1],
                reward_address: keys[i + 2]
            }
        }
    }).filter(v => v !== undefined) as Validator[];
}

async function validatorSendInactive({address, private_key}: InstanceKey) {
    console.group(`✈️  Sending inactive for ${address}...`)

    console.log(`👂  Subscribing for ${address}...`)
    const { next } = await client.logs.subscribe({addresses: [address]});
    next(async (data) => {
        console.log(`😯  Got log for ${address}`)
        if(data.transactions.length === 0) {
            console.log('\t😔 but no transactions found. Ignoring...')
            return
        }
    
        const txData = (await client.transaction.by({ hash: data.transactions[0].hash }));
        console.log(`\t😮  Transaction data for ${address}`)
        console.log(txData);
        console.log('\n\n\n')
    })

    const params: InactiveValidatorTxParams = {
        fee: 0,
        senderWallet: address,
        signingSecretKey: private_key,
        validator: address,
        relativeValidityStartHeight: 4
    }
    
    console.log(`😟  Sending inactive tx for ${address}...`)
    const tx = await client.validator.action.inactive.send(params).catch(e => console.error(e))
    console.log(tx);

    console.groupEnd()
}

let client: Client

async function main(){ 
    client = new Client(new URL("http://localhost:10300"));
    const validators = await registerValidators(client);

    const randomValidator = validators[Math.floor(Math.random() * validators.length)];
    await validatorSendInactive(randomValidator.signing_keypair);
}

main()