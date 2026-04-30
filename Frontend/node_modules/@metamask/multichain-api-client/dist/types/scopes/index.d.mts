import type { Bip122Rpc } from "./bip122.types.mjs";
import type { Eip155Rpc } from "./eip155.types.mjs";
import type { SolanaRpc } from "./solana.types.mjs";
import type { TronRpc } from "./tron.types.mjs";
export type RpcApi = Record<string, {
    methods: Record<string, RpcMethod<any, any>>;
    events?: string[];
}>;
export type RpcMethod<Params, Return> = (params: Params) => Promise<Return> | Return;
export type BaseScope<T extends RpcApi> = Extract<keyof DefaultRpcApi, string> | Extract<keyof T, string>;
export type Scope<T extends RpcApi = DefaultRpcApi> = `${BaseScope<T>}:${string}`;
export type ExtractBaseScope<T extends RpcApi, S extends Scope<T>> = S extends `${infer U}:${infer _}` ? U : never;
export type BaseScopeFromFull<T extends RpcApi, S extends Scope<T>> = ExtractBaseScope<T, S> extends BaseScope<T> ? ExtractBaseScope<T, S> : never;
export type MethodName<T extends RpcApi, S extends Scope<T>> = keyof T[BaseScopeFromFull<T, S>]['methods'] & string;
export type MethodParams<T extends RpcApi, S extends Scope<T>, M extends MethodName<T, S>> = Parameters<T[BaseScopeFromFull<T, S>]['methods'][M]>[0];
export type MethodReturn<T extends RpcApi, S extends Scope<T>, M extends MethodName<T, S>> = Promise<ReturnType<T[BaseScopeFromFull<T, S>]['methods'][M]>>;
export type DefaultRpcApi = {
    eip155: Eip155Rpc;
    solana: SolanaRpc;
    bip122: Bip122Rpc;
    tron: TronRpc;
};
//# sourceMappingURL=index.d.mts.map