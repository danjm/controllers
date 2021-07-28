"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokensController = void 0;
const events_1 = require("events");
const contract_metadata_1 = __importDefault(require("@metamask/contract-metadata"));
const human_standard_collectible_abi_1 = __importDefault(require("human-standard-collectible-abi"));
const uuid_1 = require("uuid");
const async_mutex_1 = require("async-mutex");
const ethers_1 = require("ethers");
const BaseController_1 = require("../BaseController");
const util_1 = require("../util");
const constants_1 = require("../constants");
const ERC721_INTERFACE_ID = '0x80ac58cd';
var SuggestedAssetStatus;
(function (SuggestedAssetStatus) {
    SuggestedAssetStatus["accepted"] = "accepted";
    SuggestedAssetStatus["failed"] = "failed";
    SuggestedAssetStatus["pending"] = "pending";
    SuggestedAssetStatus["rejected"] = "rejected";
})(SuggestedAssetStatus || (SuggestedAssetStatus = {}));
/**
 * Controller that stores assets and exposes convenience methods
 */
class TokensController extends BaseController_1.BaseController {
    /**
     * Creates a TokensController instance
     *
     * @param options
     * @param options.onPreferencesStateChange - Allows subscribing to preference controller state changes
     * @param options.onNetworkStateChange - Allows subscribing to network controller state changes
     * @param config - Initial options used to configure this controller
     * @param state - Initial state to set on this controller
     */
    constructor({ onPreferencesStateChange, onNetworkStateChange, config, state, }) {
        super(config, state);
        this.mutex = new async_mutex_1.Mutex();
        /**
         * EventEmitter instance used to listen to specific EIP747 events
         */
        this.hub = new events_1.EventEmitter();
        /**
         * Name of this controller used during composition
         */
        this.name = 'TokensController';
        this.defaultConfig = Object.assign({ networkType: constants_1.MAINNET, selectedAddress: '', chainId: '', provider: undefined }, config);
        this.defaultState = Object.assign({ allTokens: {}, ignoredTokens: [], suggestedAssets: [], tokens: [] }, state);
        this.initialize();
        onPreferencesStateChange(({ selectedAddress }) => {
            var _a;
            const { allTokens } = this.state;
            const { chainId } = this.config;
            this.configure({ selectedAddress });
            this.update({
                tokens: ((_a = allTokens[selectedAddress]) === null || _a === void 0 ? void 0 : _a[chainId]) || [],
            });
        });
        onNetworkStateChange(({ provider }) => {
            var _a;
            const { allTokens } = this.state;
            const { selectedAddress } = this.config;
            const { chainId } = provider;
            this.configure({ chainId });
            this.ethersProvider = this._instantiateNewEthersProvider();
            this.update({
                tokens: ((_a = allTokens[selectedAddress]) === null || _a === void 0 ? void 0 : _a[chainId]) || [],
            });
        });
    }
    failSuggestedAsset(suggestedAssetMeta, error) {
        const failedSuggestedAssetMeta = Object.assign(Object.assign({}, suggestedAssetMeta), { status: SuggestedAssetStatus.failed, error });
        this.hub.emit(`${suggestedAssetMeta.id}:finished`, failedSuggestedAssetMeta);
    }
    _instantiateNewEthersProvider() {
        var _a;
        return new ethers_1.ethers.providers.Web3Provider((_a = this.config) === null || _a === void 0 ? void 0 : _a.provider);
    }
    /**
     * Adds a token to the stored token list
     *
     * @param address - Hex address of the token contract
     * @param symbol - Symbol of the token
     * @param decimals - Number of decimals the token uses
     * @param image - Image of the token
     * @returns - Current token list
     */
    addToken(address, symbol, decimals, image) {
        return __awaiter(this, void 0, void 0, function* () {
            const releaseLock = yield this.mutex.acquire();
            try {
                address = util_1.toChecksumHexAddress(address);
                const { allTokens, tokens } = this.state;
                const { chainId, selectedAddress } = this.config;
                const isERC721 = yield this._detectIsERC721(address);
                const newEntry = { address, symbol, decimals, image, isERC721 };
                const previousEntry = tokens.find((token) => token.address.toLowerCase() === address.toLowerCase());
                if (previousEntry) {
                    const previousIndex = tokens.indexOf(previousEntry);
                    tokens[previousIndex] = newEntry;
                }
                else {
                    tokens.push(newEntry);
                }
                const addressTokens = allTokens[selectedAddress];
                const newAddressTokens = Object.assign(Object.assign({}, addressTokens), { [chainId]: tokens });
                const newAllTokens = Object.assign(Object.assign({}, allTokens), { [selectedAddress]: newAddressTokens });
                const newTokens = [...tokens];
                this.update({ allTokens: newAllTokens, tokens: newTokens });
                return newTokens;
            }
            finally {
                releaseLock();
            }
        });
    }
    /**
     * Adds a batch of tokens to the stored token list
     *
     * @param tokens - Array of Tokens to be added or updated
     * @returns - Current token list
     */
    addTokens(tokensToAdd) {
        return __awaiter(this, void 0, void 0, function* () {
            const releaseLock = yield this.mutex.acquire();
            const { allTokens, tokens } = this.state;
            const { chainId, selectedAddress } = this.config;
            try {
                tokensToAdd = yield Promise.all(tokensToAdd.map((token) => __awaiter(this, void 0, void 0, function* () {
                    token.isERC721 = yield this._detectIsERC721(token.address);
                    return token;
                })));
                tokensToAdd.forEach((tokenToAdd) => {
                    const { address, symbol, decimals, image, isERC721 } = tokenToAdd;
                    const checksumAddress = util_1.toChecksumHexAddress(address);
                    const newEntry = {
                        address: checksumAddress,
                        symbol,
                        decimals,
                        image,
                        isERC721,
                    };
                    const previousEntry = tokens.find((token) => token.address.toLowerCase() === checksumAddress.toLowerCase());
                    if (previousEntry) {
                        const previousIndex = tokens.indexOf(previousEntry);
                        tokens[previousIndex] = newEntry;
                    }
                    else {
                        tokens.push(newEntry);
                    }
                });
                const addressTokens = allTokens[selectedAddress];
                const newAddressTokens = Object.assign(Object.assign({}, addressTokens), { [chainId]: tokens });
                const newAllTokens = Object.assign(Object.assign({}, allTokens), { [selectedAddress]: newAddressTokens });
                const newTokens = [...tokens];
                this.update({ allTokens: newAllTokens, tokens: newTokens });
                return newTokens;
            }
            finally {
                releaseLock();
            }
        });
    }
    /**
     * Adds isERC721 field to token object
     * (Called when a user attempts to add tokens that were previously added which do not yet had isERC721 field)
     *
     * @param {string} tokenAddress - The contract address of the token requiring the isERC721 field added.
     * @returns The new token object with the added isERC721 field.
     *
     */
    updateTokenType(tokenAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const isERC721 = yield this._detectIsERC721(tokenAddress);
            const { tokens } = this.state;
            const tokenIndex = tokens.findIndex((token) => {
                return token.address.toLowerCase() === tokenAddress.toLowerCase();
            });
            tokens[tokenIndex].isERC721 = isERC721;
            this.update({ tokens });
            return tokens[tokenIndex];
        });
    }
    /**
     * Detects whether or not a token is ERC-721 compatible.
     *
     * @param {string} tokensAddress - the token contract address.
     * @returns boolean indicating whether the token address passed in supports the EIP-721 interface.
     *
     */
    _detectIsERC721(tokenAddress) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const checksumAddress = util_1.toChecksumHexAddress(tokenAddress);
            // if this token is already in our contract metadata map we don't need
            // to check against the contract
            if (((_a = contract_metadata_1.default[checksumAddress]) === null || _a === void 0 ? void 0 : _a.erc721) === true) {
                return Promise.resolve(true);
            }
            else if (((_b = contract_metadata_1.default[checksumAddress]) === null || _b === void 0 ? void 0 : _b.erc20) === true) {
                return Promise.resolve(false);
            }
            const tokenContract = yield this._createEthersContract(tokenAddress, human_standard_collectible_abi_1.default, this.ethersProvider);
            try {
                return yield tokenContract.supportsInterface(ERC721_INTERFACE_ID);
            }
            catch (error) {
                // currently we see a variety of errors across different networks when
                // token contracts are not ERC721 compatible. We need to figure out a better
                // way of differentiating token interface types but for now if we get an error
                // we have to assume the token is not ERC721 compatible.
                return false;
            }
        });
    }
    _createEthersContract(tokenAddress, abi, ethersProvider) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenContract = yield new ethers_1.ethers.Contract(tokenAddress, abi, ethersProvider);
            return tokenContract;
        });
    }
    _generateRandomId() {
        return uuid_1.v1();
    }
    /**
     * Adds a new suggestedAsset to state. Parameters will be validated according to
     * asset type being watched. A `<suggestedAssetMeta.id>:pending` hub event will be emitted once added.
     *
     * @param asset - Asset to be watched. For now only ERC20 tokens are accepted.
     * @param type - Asset type
     * @returns - Object containing a promise resolving to the suggestedAsset address if accepted
     */
    watchAsset(asset, type) {
        return __awaiter(this, void 0, void 0, function* () {
            const suggestedAssetMeta = {
                asset,
                id: this._generateRandomId(),
                status: SuggestedAssetStatus.pending,
                time: Date.now(),
                type,
            };
            try {
                switch (type) {
                    case 'ERC20':
                        util_1.validateTokenToWatch(asset);
                        break;
                    default:
                        throw new Error(`Asset of type ${type} not supported`);
                }
            }
            catch (error) {
                this.failSuggestedAsset(suggestedAssetMeta, error);
                return Promise.reject(error);
            }
            const result = new Promise((resolve, reject) => {
                this.hub.once(`${suggestedAssetMeta.id}:finished`, (meta) => {
                    switch (meta.status) {
                        case SuggestedAssetStatus.accepted:
                            return resolve(meta.asset.address);
                        case SuggestedAssetStatus.rejected:
                            return reject(new Error('User rejected to watch the asset.'));
                        case SuggestedAssetStatus.failed:
                            return reject(new Error(meta.error.message));
                        /* istanbul ignore next */
                        default:
                            return reject(new Error(`Unknown status: ${meta.status}`));
                    }
                });
            });
            const { suggestedAssets } = this.state;
            suggestedAssets.push(suggestedAssetMeta);
            this.update({ suggestedAssets: [...suggestedAssets] });
            this.hub.emit('pendingSuggestedAsset', suggestedAssetMeta);
            return { result, suggestedAssetMeta };
        });
    }
    /**
     * Accepts to watch an asset and updates it's status and deletes the suggestedAsset from state,
     * adding the asset to corresponding asset state. In this case ERC20 tokens.
     * A `<suggestedAssetMeta.id>:finished` hub event is fired after accepted or failure.
     *
     * @param suggestedAssetID - ID of the suggestedAsset to accept
     * @returns - Promise resolving when this operation completes
     */
    acceptWatchAsset(suggestedAssetID) {
        return __awaiter(this, void 0, void 0, function* () {
            const { suggestedAssets } = this.state;
            const index = suggestedAssets.findIndex(({ id }) => suggestedAssetID === id);
            const suggestedAssetMeta = suggestedAssets[index];
            try {
                switch (suggestedAssetMeta.type) {
                    case 'ERC20':
                        const { address, symbol, decimals, image } = suggestedAssetMeta.asset;
                        yield this.addToken(address, symbol, decimals, image);
                        suggestedAssetMeta.status = SuggestedAssetStatus.accepted;
                        this.hub.emit(`${suggestedAssetMeta.id}:finished`, suggestedAssetMeta);
                        break;
                    default:
                        throw new Error(`Asset of type ${suggestedAssetMeta.type} not supported`);
                }
            }
            catch (error) {
                this.failSuggestedAsset(suggestedAssetMeta, error);
            }
            const newSuggestedAssets = suggestedAssets.filter(({ id }) => id !== suggestedAssetID);
            this.update({ suggestedAssets: [...newSuggestedAssets] });
        });
    }
    /**
     * Rejects a watchAsset request based on its ID by setting its status to "rejected"
     * and emitting a `<suggestedAssetMeta.id>:finished` hub event.
     *
     * @param suggestedAssetID - ID of the suggestedAsset to accept
     */
    rejectWatchAsset(suggestedAssetID) {
        const { suggestedAssets } = this.state;
        const index = suggestedAssets.findIndex(({ id }) => suggestedAssetID === id);
        const suggestedAssetMeta = suggestedAssets[index];
        if (!suggestedAssetMeta) {
            return;
        }
        suggestedAssetMeta.status = SuggestedAssetStatus.rejected;
        this.hub.emit(`${suggestedAssetMeta.id}:finished`, suggestedAssetMeta);
        const newSuggestedAssets = suggestedAssets.filter(({ id }) => id !== suggestedAssetID);
        this.update({ suggestedAssets: [...newSuggestedAssets] });
    }
    /**
     * Removes a token from the stored token list and saves it in ignored tokens list
     *
     * @param address - Hex address of the token contract
     */
    removeAndIgnoreToken(address) {
        address = util_1.toChecksumHexAddress(address);
        const { allTokens, tokens, ignoredTokens } = this.state;
        const { chainId, selectedAddress } = this.config;
        const newIgnoredTokens = [...ignoredTokens];
        const newTokens = tokens.filter((token) => {
            if (token.address.toLowerCase() === address.toLowerCase()) {
                const alreadyIgnored = newIgnoredTokens.find((t) => t.address.toLowerCase() === address.toLowerCase());
                !alreadyIgnored && newIgnoredTokens.push(token);
                return false;
            }
            return true;
        });
        if (!newIgnoredTokens.find((token) => token.address.toLowerCase() === address.toLowerCase())) {
            newIgnoredTokens.push({ address, decimals: 0, symbol: '' });
        }
        const addressTokens = allTokens[selectedAddress];
        const newAddressTokens = Object.assign(Object.assign({}, addressTokens), { [chainId]: newTokens });
        const newAllTokens = Object.assign(Object.assign({}, allTokens), { [selectedAddress]: newAddressTokens });
        this.update({
            allTokens: newAllTokens,
            tokens: newTokens,
            ignoredTokens: newIgnoredTokens,
        });
    }
    /**
     * Removes a token from the stored token list
     *
     * @param address - Hex address of the token contract
     */
    removeToken(address) {
        address = util_1.toChecksumHexAddress(address);
        const { allTokens, tokens } = this.state;
        const { chainId, selectedAddress } = this.config;
        const newTokens = tokens.filter((token) => token.address !== address);
        const addressTokens = allTokens[selectedAddress];
        const newAddressTokens = Object.assign(Object.assign({}, addressTokens), { [chainId]: newTokens });
        const newAllTokens = Object.assign(Object.assign({}, allTokens), { [selectedAddress]: newAddressTokens });
        this.update({ allTokens: newAllTokens, tokens: newTokens });
    }
    /**
     * Removes all tokens from the ignored list
     */
    clearIgnoredTokens() {
        this.update({ ignoredTokens: [] });
    }
}
exports.TokensController = TokensController;
exports.default = TokensController;
//# sourceMappingURL=TokensController.js.map