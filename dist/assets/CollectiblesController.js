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
exports.CollectiblesController = void 0;
const events_1 = require("events");
const async_mutex_1 = require("async-mutex");
const BaseController_1 = require("../BaseController");
const util_1 = require("../util");
const constants_1 = require("../constants");
const assetsUtil_1 = require("./assetsUtil");
/**
 * Controller that stores assets and exposes convenience methods
 */
class CollectiblesController extends BaseController_1.BaseController {
    /**
     * Creates a CollectiblesController instance
     *
     * @param options
     * @param options.onPreferencesStateChange - Allows subscribing to preference controller state changes
     * @param options.onNetworkStateChange - Allows subscribing to network controller state changes
     * @param options.getAssetName - Gets the name of the asset at the given address
     * @param options.getAssetSymbol - Gets the symbol of the asset at the given address
     * @param options.getCollectibleTokenURI - Gets the URI of the NFT at the given address, with the given ID
     * @param config - Initial options used to configure this controller
     * @param state - Initial state to set on this controller
     */
    constructor({ onPreferencesStateChange, onNetworkStateChange, getAssetName, getAssetSymbol, getCollectibleTokenURI, }, config, state) {
        super(config, state);
        this.mutex = new async_mutex_1.Mutex();
        /**
         * EventEmitter instance used to listen to specific EIP747 events
         */
        this.hub = new events_1.EventEmitter();
        /**
         * Name of this controller used during composition
         */
        this.name = 'CollectiblesController';
        this.defaultConfig = {
            networkType: constants_1.MAINNET,
            selectedAddress: '',
            chainId: '',
        };
        this.defaultState = {
            allCollectibleContracts: {},
            allCollectibles: {},
            collectibleContracts: [],
            collectibles: [],
            ignoredCollectibles: [],
        };
        this.initialize();
        this.getAssetName = getAssetName;
        this.getAssetSymbol = getAssetSymbol;
        this.getCollectibleTokenURI = getCollectibleTokenURI;
        onPreferencesStateChange(({ selectedAddress }) => {
            var _a, _b;
            const { allCollectibleContracts, allCollectibles } = this.state;
            const { chainId } = this.config;
            this.configure({ selectedAddress });
            this.update({
                collectibleContracts: ((_a = allCollectibleContracts[selectedAddress]) === null || _a === void 0 ? void 0 : _a[chainId]) || [],
                collectibles: ((_b = allCollectibles[selectedAddress]) === null || _b === void 0 ? void 0 : _b[chainId]) || [],
            });
        });
        onNetworkStateChange(({ provider }) => {
            var _a, _b;
            const { allCollectibleContracts, allCollectibles } = this.state;
            const { selectedAddress } = this.config;
            const { chainId } = provider;
            this.configure({ chainId });
            this.update({
                collectibleContracts: ((_a = allCollectibleContracts[selectedAddress]) === null || _a === void 0 ? void 0 : _a[chainId]) || [],
                collectibles: ((_b = allCollectibles[selectedAddress]) === null || _b === void 0 ? void 0 : _b[chainId]) || [],
            });
        });
    }
    getCollectibleApi(contractAddress, tokenId) {
        return `https://api.opensea.io/api/v1/asset/${contractAddress}/${tokenId}`;
    }
    getCollectibleContractInformationApi(contractAddress) {
        return `https://api.opensea.io/api/v1/asset_contract/${contractAddress}`;
    }
    /**
     * Request individual collectible information from OpenSea api
     *
     * @param contractAddress - Hex address of the collectible contract
     * @param tokenId - The collectible identifier
     * @returns - Promise resolving to the current collectible name and image
     */
    getCollectibleInformationFromApi(contractAddress, tokenId) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenURI = this.getCollectibleApi(contractAddress, tokenId);
            let collectibleInformation;
            /* istanbul ignore if */
            if (this.openSeaApiKey) {
                collectibleInformation = yield util_1.handleFetch(tokenURI, {
                    headers: { 'X-API-KEY': this.openSeaApiKey },
                });
            }
            else {
                collectibleInformation = yield util_1.handleFetch(tokenURI);
            }
            const { num_sales, background_color, image_url, image_preview_url, image_thumbnail_url, image_original_url, animation_url, animation_original_url, name, description, external_link, creator, last_sale, } = collectibleInformation;
            /* istanbul ignore next */
            const collectibleMetadata = Object.assign({}, { name }, creator && { creator }, description && { description }, image_url && { image: image_url }, num_sales && { numberOfSales: num_sales }, background_color && { backgroundColor: background_color }, image_preview_url && { imagePreview: image_preview_url }, image_thumbnail_url && { imageThumbnail: image_thumbnail_url }, image_original_url && { imageOriginal: image_original_url }, animation_url && { animation: animation_url }, animation_original_url && {
                animationOriginal: animation_original_url,
            }, external_link && { externalLink: external_link }, last_sale && { lastSale: last_sale });
            return collectibleMetadata;
        });
    }
    /**
     * Request individual collectible information from contracts that follows Metadata Interface
     *
     * @param contractAddress - Hex address of the collectible contract
     * @param tokenId - The collectible identifier
     * @returns - Promise resolving to the current collectible name and image
     */
    getCollectibleInformationFromTokenURI(contractAddress, tokenId) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenURI = yield this.getCollectibleTokenURI(contractAddress, tokenId);
            const object = yield util_1.handleFetch(tokenURI);
            const image = Object.prototype.hasOwnProperty.call(object, 'image')
                ? 'image'
                : /* istanbul ignore next */ 'image_url';
            return { image: object[image], name: object.name };
        });
    }
    /**
     * Request individual collectible information (name, image url and description)
     *
     * @param contractAddress - Hex address of the collectible contract
     * @param tokenId - The collectible identifier
     * @returns - Promise resolving to the current collectible name and image
     */
    getCollectibleInformation(contractAddress, tokenId) {
        return __awaiter(this, void 0, void 0, function* () {
            let information;
            // First try with OpenSea
            information = yield util_1.safelyExecute(() => __awaiter(this, void 0, void 0, function* () {
                return yield this.getCollectibleInformationFromApi(contractAddress, tokenId);
            }));
            if (information) {
                return information;
            }
            // Then following ERC721 standard
            information = yield util_1.safelyExecute(() => __awaiter(this, void 0, void 0, function* () {
                return yield this.getCollectibleInformationFromTokenURI(contractAddress, tokenId);
            }));
            /* istanbul ignore next */
            if (information) {
                return information;
            }
            /* istanbul ignore next */
            return {};
        });
    }
    /**
     * Request collectible contract information from OpenSea api
     *
     * @param contractAddress - Hex address of the collectible contract
     * @returns - Promise resolving to the current collectible name and image
     */
    getCollectibleContractInformationFromApi(contractAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const api = this.getCollectibleContractInformationApi(contractAddress);
            let apiCollectibleContractObject;
            /* istanbul ignore if */
            if (this.openSeaApiKey) {
                apiCollectibleContractObject = yield util_1.handleFetch(api, {
                    headers: { 'X-API-KEY': this.openSeaApiKey },
                });
            }
            else {
                apiCollectibleContractObject = yield util_1.handleFetch(api);
            }
            return apiCollectibleContractObject;
        });
    }
    /**
     * Request collectible contract information from the contract itself
     *
     * @param contractAddress - Hex address of the collectible contract
     * @returns - Promise resolving to the current collectible name and image
     */
    getCollectibleContractInformationFromContract(contractAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const name = yield this.getAssetName(contractAddress);
            const symbol = yield this.getAssetSymbol(contractAddress);
            return {
                name,
                symbol,
                address: contractAddress,
                asset_contract_type: null,
                created_date: null,
                schema_name: null,
                total_supply: null,
                description: null,
                external_link: null,
                image_url: null,
            };
        });
    }
    /**
     * Request collectible contract information from OpenSea api
     *
     * @param contractAddress - Hex address of the collectible contract
     * @returns - Promise resolving to the collectible contract name, image and description
     */
    getCollectibleContractInformation(contractAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            let information;
            // First try with OpenSea
            information = yield util_1.safelyExecute(() => __awaiter(this, void 0, void 0, function* () {
                return yield this.getCollectibleContractInformationFromApi(contractAddress);
            }));
            if (information) {
                return information;
            }
            // Then following ERC721 standard
            information = yield util_1.safelyExecute(() => __awaiter(this, void 0, void 0, function* () {
                return yield this.getCollectibleContractInformationFromContract(contractAddress);
            }));
            if (information) {
                return information;
            }
            /* istanbul ignore next */
            return {
                address: contractAddress,
                asset_contract_type: null,
                created_date: null,
                name: null,
                schema_name: null,
                symbol: null,
                total_supply: null,
                description: null,
                external_link: null,
                image_url: null,
            };
        });
    }
    /**
     * Adds an individual collectible to the stored collectible list
     *
     * @param address - Hex address of the collectible contract
     * @param tokenId - The collectible identifier
     * @param opts - Collectible optional information (name, image and description)
     * @returns - Promise resolving to the current collectible list
     */
    addIndividualCollectible(address, tokenId, collectibleMetadata) {
        return __awaiter(this, void 0, void 0, function* () {
            const releaseLock = yield this.mutex.acquire();
            try {
                address = util_1.toChecksumHexAddress(address);
                const { allCollectibles, collectibles } = this.state;
                const { chainId, selectedAddress } = this.config;
                const existingEntry = collectibles.find((collectible) => collectible.address.toLowerCase() === address.toLowerCase() &&
                    collectible.tokenId === tokenId);
                /* istanbul ignore next */
                collectibleMetadata =
                    collectibleMetadata ||
                        (yield this.getCollectibleInformation(address, tokenId));
                if (existingEntry) {
                    const differentMetadata = assetsUtil_1.compareCollectiblesMetadata(collectibleMetadata, existingEntry);
                    if (differentMetadata) {
                        const indexToRemove = collectibles.findIndex((collectible) => collectible.address.toLowerCase() === address.toLowerCase() &&
                            collectible.tokenId === tokenId);
                        /* istanbul ignore next */
                        if (indexToRemove !== -1) {
                            collectibles.splice(indexToRemove, 1);
                        }
                    }
                    else {
                        return collectibles;
                    }
                }
                const newEntry = Object.assign({ address,
                    tokenId }, collectibleMetadata);
                const newCollectibles = [...collectibles, newEntry];
                const addressCollectibles = allCollectibles[selectedAddress];
                const newAddressCollectibles = Object.assign(Object.assign({}, addressCollectibles), { [chainId]: newCollectibles });
                const newAllCollectibles = Object.assign(Object.assign({}, allCollectibles), { [selectedAddress]: newAddressCollectibles });
                this.update({
                    allCollectibles: newAllCollectibles,
                    collectibles: newCollectibles,
                });
                return newCollectibles;
            }
            finally {
                releaseLock();
            }
        });
    }
    /**
     * Adds a collectible contract to the stored collectible contracts list
     *
     * @param address - Hex address of the collectible contract
     * @param detection? - Whether the collectible is manually added or auto-detected
     * @returns - Promise resolving to the current collectible contracts list
     */
    addCollectibleContract(address, detection) {
        return __awaiter(this, void 0, void 0, function* () {
            const releaseLock = yield this.mutex.acquire();
            try {
                address = util_1.toChecksumHexAddress(address);
                const { allCollectibleContracts, collectibleContracts } = this.state;
                const { chainId, selectedAddress } = this.config;
                const existingEntry = collectibleContracts.find((collectibleContract) => collectibleContract.address.toLowerCase() === address.toLowerCase());
                if (existingEntry) {
                    return collectibleContracts;
                }
                const contractInformation = yield this.getCollectibleContractInformation(address);
                const { asset_contract_type, created_date, name, schema_name, symbol, total_supply, description, external_link, image_url, } = contractInformation;
                // If being auto-detected opensea information is expected
                // Oherwise at least name and symbol from contract is needed
                if ((detection && !image_url) ||
                    Object.keys(contractInformation).length === 0) {
                    return collectibleContracts;
                }
                /* istanbul ignore next */
                const newEntry = Object.assign({}, { address }, description && { description }, name && { name }, image_url && { logo: image_url }, symbol && { symbol }, total_supply !== null && { totalSupply: total_supply }, asset_contract_type && { assetContractType: asset_contract_type }, created_date && { createdDate: created_date }, schema_name && { schemaName: schema_name }, external_link && { externalLink: external_link });
                const newCollectibleContracts = [...collectibleContracts, newEntry];
                const addressCollectibleContracts = allCollectibleContracts[selectedAddress];
                const newAddressCollectibleContracts = Object.assign(Object.assign({}, addressCollectibleContracts), { [chainId]: newCollectibleContracts });
                const newAllCollectibleContracts = Object.assign(Object.assign({}, allCollectibleContracts), { [selectedAddress]: newAddressCollectibleContracts });
                this.update({
                    allCollectibleContracts: newAllCollectibleContracts,
                    collectibleContracts: newCollectibleContracts,
                });
                return newCollectibleContracts;
            }
            finally {
                releaseLock();
            }
        });
    }
    /**
     * Removes an individual collectible from the stored token list and saves it in ignored collectibles list
     *
     * @param address - Hex address of the collectible contract
     * @param tokenId - Token identifier of the collectible
     */
    removeAndIgnoreIndividualCollectible(address, tokenId) {
        address = util_1.toChecksumHexAddress(address);
        const { allCollectibles, collectibles, ignoredCollectibles } = this.state;
        const { chainId, selectedAddress } = this.config;
        const newIgnoredCollectibles = [...ignoredCollectibles];
        const newCollectibles = collectibles.filter((collectible) => {
            if (collectible.address.toLowerCase() === address.toLowerCase() &&
                collectible.tokenId === tokenId) {
                const alreadyIgnored = newIgnoredCollectibles.find((c) => c.address === address && c.tokenId === tokenId);
                !alreadyIgnored && newIgnoredCollectibles.push(collectible);
                return false;
            }
            return true;
        });
        const addressCollectibles = allCollectibles[selectedAddress];
        const newAddressCollectibles = Object.assign(Object.assign({}, addressCollectibles), { [chainId]: newCollectibles });
        const newAllCollectibles = Object.assign(Object.assign({}, allCollectibles), { [selectedAddress]: newAddressCollectibles });
        this.update({
            allCollectibles: newAllCollectibles,
            collectibles: newCollectibles,
            ignoredCollectibles: newIgnoredCollectibles,
        });
    }
    /**
     * Removes an individual collectible from the stored token list
     *
     * @param address - Hex address of the collectible contract
     * @param tokenId - Token identifier of the collectible
     */
    removeIndividualCollectible(address, tokenId) {
        address = util_1.toChecksumHexAddress(address);
        const { allCollectibles, collectibles } = this.state;
        const { chainId, selectedAddress } = this.config;
        const newCollectibles = collectibles.filter((collectible) => !(collectible.address.toLowerCase() === address.toLowerCase() &&
            collectible.tokenId === tokenId));
        const addressCollectibles = allCollectibles[selectedAddress];
        const newAddressCollectibles = Object.assign(Object.assign({}, addressCollectibles), { [chainId]: newCollectibles });
        const newAllCollectibles = Object.assign(Object.assign({}, allCollectibles), { [selectedAddress]: newAddressCollectibles });
        this.update({
            allCollectibles: newAllCollectibles,
            collectibles: newCollectibles,
        });
    }
    /**
     * Removes a collectible contract to the stored collectible contracts list
     *
     * @param address - Hex address of the collectible contract
     * @returns - Promise resolving to the current collectible contracts list
     */
    removeCollectibleContract(address) {
        address = util_1.toChecksumHexAddress(address);
        const { allCollectibleContracts, collectibleContracts } = this.state;
        const { chainId, selectedAddress } = this.config;
        const newCollectibleContracts = collectibleContracts.filter((collectibleContract) => !(collectibleContract.address.toLowerCase() === address.toLowerCase()));
        const addressCollectibleContracts = allCollectibleContracts[selectedAddress];
        const newAddressCollectibleContracts = Object.assign(Object.assign({}, addressCollectibleContracts), { [chainId]: newCollectibleContracts });
        const newAllCollectibleContracts = Object.assign(Object.assign({}, allCollectibleContracts), { [selectedAddress]: newAddressCollectibleContracts });
        this.update({
            allCollectibleContracts: newAllCollectibleContracts,
            collectibleContracts: newCollectibleContracts,
        });
        return newCollectibleContracts;
    }
    /**
     * Sets an OpenSea API key to retrieve collectible information
     *
     * @param openSeaApiKey - OpenSea API key
     */
    setApiKey(openSeaApiKey) {
        this.openSeaApiKey = openSeaApiKey;
    }
    /**
     * Adds a collectible and respective collectible contract to the stored collectible and collectible contracts lists
     *
     * @param address - Hex address of the collectible contract
     * @param tokenId - The collectible identifier
     * @param collectibleMetadata - Collectible optional metadata
     * @param detection? - Whether the collectible is manually added or autodetected
     * @returns - Promise resolving to the current collectible list
     */
    addCollectible(address, tokenId, collectibleMetadata, detection) {
        return __awaiter(this, void 0, void 0, function* () {
            address = util_1.toChecksumHexAddress(address);
            const newCollectibleContracts = yield this.addCollectibleContract(address, detection);
            collectibleMetadata =
                collectibleMetadata ||
                    (yield this.getCollectibleInformation(address, tokenId));
            // If collectible contract was not added, do not add individual collectible
            const collectibleContract = newCollectibleContracts.find((contract) => contract.address.toLowerCase() === address.toLowerCase());
            // If collectible contract information, add individual collectible
            if (collectibleContract) {
                yield this.addIndividualCollectible(address, tokenId, collectibleMetadata);
            }
        });
    }
    /**
     * Removes a collectible from the stored token list
     *
     * @param address - Hex address of the collectible contract
     * @param tokenId - Token identifier of the collectible
     */
    removeCollectible(address, tokenId) {
        address = util_1.toChecksumHexAddress(address);
        this.removeIndividualCollectible(address, tokenId);
        const { collectibles } = this.state;
        const remainingCollectible = collectibles.find((collectible) => collectible.address.toLowerCase() === address.toLowerCase());
        if (!remainingCollectible) {
            this.removeCollectibleContract(address);
        }
    }
    /**
     * Removes a collectible from the stored token list and saves it in ignored collectibles list
     *
     * @param address - Hex address of the collectible contract
     * @param tokenId - Token identifier of the collectible
     */
    removeAndIgnoreCollectible(address, tokenId) {
        address = util_1.toChecksumHexAddress(address);
        this.removeAndIgnoreIndividualCollectible(address, tokenId);
        const { collectibles } = this.state;
        const remainingCollectible = collectibles.find((collectible) => collectible.address.toLowerCase() === address.toLowerCase());
        if (!remainingCollectible) {
            this.removeCollectibleContract(address);
        }
    }
    /**
     * Removes all collectibles from the ignored list
     */
    clearIgnoredCollectibles() {
        this.update({ ignoredCollectibles: [] });
    }
}
exports.CollectiblesController = CollectiblesController;
exports.default = CollectiblesController;
//# sourceMappingURL=CollectiblesController.js.map