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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenRatesController = void 0;
const BaseController_1 = require("../BaseController");
const util_1 = require("../util");
const CoinGeckoApi = {
    BASE_URL: 'https://api.coingecko.com/api/v3',
    getTokenPriceURL(chainSlug, query) {
        return `${this.BASE_URL}/simple/token_price/${chainSlug}?${query}`;
    },
    getPlatformsURL() {
        return `${this.BASE_URL}/asset_platforms`;
    },
};
/**
 * Finds the chain slug in the data array given a chainId
 *
 * @param chainId current chainId
 * @param data Array of supported platforms from CoinGecko API
 * @returns Slug of chainId
 */
function findChainSlug(chainId, data) {
    var _a;
    if (!data) {
        return null;
    }
    const chain = (_a = data.find(({ chain_identifier }) => chain_identifier !== null && String(chain_identifier) === chainId)) !== null && _a !== void 0 ? _a : null;
    return (chain === null || chain === void 0 ? void 0 : chain.id) || null;
}
/**
 * Controller that passively polls on a set interval for token-to-fiat exchange rates
 * for tokens stored in the TokensController
 */
class TokenRatesController extends BaseController_1.BaseController {
    /**
     * Creates a TokenRatesController instance
     *
     * @param options
     * @param options.onAssetsStateChange - Allows subscribing to assets controller state changes
     * @param options.onCurrencyRateStateChange - Allows subscribing to currency rate controller state changes
     * @param config - Initial options used to configure this controller
     * @param state - Initial state to set on this controller
     */
    constructor({ onTokensStateChange, onCurrencyRateStateChange, onNetworkStateChange, }, config, state) {
        super(config, state);
        this.tokenList = [];
        /**
         * Name of this controller used during composition
         */
        this.name = 'TokenRatesController';
        this.defaultConfig = {
            disabled: true,
            interval: 3 * 60 * 1000,
            nativeCurrency: 'eth',
            chainId: '',
            tokens: [],
            threshold: 6 * 60 * 60 * 1000,
        };
        this.defaultState = {
            contractExchangeRates: {},
            supportedChains: {
                timestamp: 0,
                data: null,
            },
        };
        this.initialize();
        this.configure({ disabled: false }, false, false);
        onTokensStateChange((tokensState) => {
            this.configure({ tokens: tokensState.tokens });
        });
        onCurrencyRateStateChange((currencyRateState) => {
            this.configure({ nativeCurrency: currencyRateState.nativeCurrency });
        });
        onNetworkStateChange(({ provider }) => {
            const { chainId } = provider;
            this.configure({ chainId });
        });
        this.poll();
    }
    /**
     * Sets a new polling interval
     *
     * @param interval - Polling interval used to fetch new token rates
     */
    poll(interval) {
        return __awaiter(this, void 0, void 0, function* () {
            interval && this.configure({ interval }, false, false);
            this.handle && clearTimeout(this.handle);
            yield util_1.safelyExecute(() => this.updateExchangeRates());
            this.handle = setTimeout(() => {
                this.poll(this.config.interval);
            }, this.config.interval);
        });
    }
    /**
     * Sets a new chainId
     *
     * TODO: Replace this with a method
     *
     * @param chainId current chainId
     */
    set chainId(_chainId) {
        !this.disabled && util_1.safelyExecute(() => this.updateExchangeRates());
    }
    get chainId() {
        throw new Error('Property only used for setting');
    }
    /**
     * Sets a new token list to track prices
     *
     * TODO: Replace this with a method
     *
     * @param tokens - List of tokens to track exchange rates for
     */
    set tokens(tokens) {
        this.tokenList = tokens;
        !this.disabled && util_1.safelyExecute(() => this.updateExchangeRates());
    }
    get tokens() {
        throw new Error('Property only used for setting');
    }
    /**
     * Fetches supported platforms from CoinGecko API
     *
     * @returns Array of supported platforms by CoinGecko API
     */
    fetchSupportedChains() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const platforms = yield util_1.handleFetch(CoinGeckoApi.getPlatformsURL());
                return platforms;
            }
            catch (_a) {
                return null;
            }
        });
    }
    /**
     * Fetches a pairs of token address and native currency
     *
     * @param chainSlug - Chain string identifier
     * @param query - Query according to tokens in tokenList and native currency
     * @returns - Promise resolving to exchange rates for given pairs
     */
    fetchExchangeRate(chainSlug, query) {
        return __awaiter(this, void 0, void 0, function* () {
            return util_1.handleFetch(CoinGeckoApi.getTokenPriceURL(chainSlug, query));
        });
    }
    /**
     * Gets current chainId slug from cached supported platforms CoinGecko API response.
     * If cached supported platforms response is stale, fetches and updates it.
     *
     * @returns current chainId
     */
    getChainSlug() {
        return __awaiter(this, void 0, void 0, function* () {
            const { threshold, chainId } = this.config;
            const { supportedChains } = this.state;
            const { data, timestamp } = supportedChains;
            const now = Date.now();
            if (now - timestamp > threshold) {
                try {
                    const platforms = yield this.fetchSupportedChains();
                    this.update({
                        supportedChains: {
                            data: platforms,
                            timestamp: Date.now(),
                        },
                    });
                    return findChainSlug(chainId, platforms);
                }
                catch (_a) {
                    return findChainSlug(chainId, data);
                }
            }
            return findChainSlug(chainId, data);
        });
    }
    /**
     * Updates exchange rates for all tokens
     *
     * @returns Promise resolving when this operation completes
     */
    updateExchangeRates() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.tokenList.length === 0 || this.disabled) {
                return;
            }
            const { nativeCurrency } = this.config;
            const slug = yield this.getChainSlug();
            const newContractExchangeRates = {};
            if (!slug) {
                this.tokenList.forEach((token) => {
                    const address = util_1.toChecksumHexAddress(token.address);
                    newContractExchangeRates[address] = undefined;
                });
            }
            else {
                const pairs = this.tokenList.map((token) => token.address).join(',');
                const query = `contract_addresses=${pairs}&vs_currencies=${nativeCurrency.toLowerCase()}`;
                const prices = yield this.fetchExchangeRate(slug, query);
                this.tokenList.forEach((token) => {
                    const address = util_1.toChecksumHexAddress(token.address);
                    const price = prices[token.address.toLowerCase()];
                    newContractExchangeRates[address] = price
                        ? price[nativeCurrency.toLowerCase()]
                        : 0;
                });
            }
            this.update({ contractExchangeRates: newContractExchangeRates });
        });
    }
}
exports.TokenRatesController = TokenRatesController;
exports.default = TokenRatesController;
//# sourceMappingURL=TokenRatesController.js.map