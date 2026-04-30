import type { RpcMethod } from "./index.cjs";
type Utxo = {
    outpoint: string;
    value: string;
    derivationIndex: number;
    scriptPubkey: string;
    scriptPubkeyHex: string;
    address?: string;
};
export type Bip122Rpc = {
    methods: {
        signMessage: RpcMethod<{
            account: {
                address: string;
            };
            message: string;
        }, {
            signature: string;
        }>;
        sendTransfer: RpcMethod<{
            account: {
                address: string;
            };
            recipients: {
                address: string;
                amount: string;
            }[];
            feeRate?: number;
        }, {
            txid: string;
        }>;
        signPsbt: RpcMethod<{
            account: {
                address: string;
            };
            options: {
                fill: boolean;
                broadcast: boolean;
            };
            psbt: string;
            feeRate?: number | undefined;
        }, {
            psbt: string;
            txid: string | null;
        }>;
        fillPsbt: RpcMethod<{
            account: {
                address: string;
            };
            psbt: string;
        }, {
            psbt: string;
        }>;
        broadcastPsbt: RpcMethod<{
            account: {
                address: string;
            };
            psbt: string;
        }, {
            txid: string;
        }>;
        computeFee: RpcMethod<{
            account: {
                address: string;
            };
            psbt: string;
        }, {
            fee: string;
        }>;
        getUtxo: RpcMethod<{
            account: {
                address: string;
            };
            outpoint: string;
        }, Utxo>;
    };
};
export {};
//# sourceMappingURL=bip122.types.d.cts.map