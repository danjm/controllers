/// <reference types="node" />
import { EventEmitter } from 'events';
import { BaseController, BaseConfig, BaseState } from '../BaseController';
import type { PreferencesState } from '../user/PreferencesController';
import type { NetworkState, NetworkType } from '../network/NetworkController';
import type { ApiCollectibleCreator, ApiCollectibleLastSale } from './AssetsDetectionController';
import type { AssetsContractController } from './AssetsContractController';
/**
 * @type Collectible
 *
 * Collectible representation
 *
 * @property address - Hex address of a ERC721 contract
 * @property description - The collectible description
 * @property image - URI of custom collectible image associated with this tokenId
 * @property name - Name associated with this tokenId and contract address
 * @property tokenId - The collectible identifier
 * @property numberOfSales - Number of sales
 * @property backgroundColor - The background color to be displayed with the item
 * @property imagePreview - URI of a smaller image associated with this collectible
 * @property imageThumbnail - URI of a thumbnail image associated with this collectible
 * @property imageOriginal - URI of the original image associated with this collectible
 * @property animation - URI of a animation associated with this collectible
 * @property animationOriginal - URI of the original animation associated with this collectible
 * @property externalLink - External link containing additional information
 * @property creator - The collectible owner information object
 */
export interface Collectible extends CollectibleMetadata {
    tokenId: number;
    address: string;
}
/**
 * @type CollectibleContract
 *
 * Collectible contract information representation
 *
 * @property name - Contract name
 * @property logo - Contract logo
 * @property address - Contract address
 * @property symbol - Contract symbol
 * @property description - Contract description
 * @property totalSupply - Total supply of collectibles
 * @property assetContractType - The collectible type, it could be `semi-fungible` or `non-fungible`
 * @property createdDate - Creation date
 * @property schemaName - The schema followed by the contract, it could be `ERC721` or `ERC1155`
 * @property externalLink - External link containing additional information
 */
export interface CollectibleContract {
    name?: string;
    logo?: string;
    address: string;
    symbol?: string;
    description?: string;
    totalSupply?: string;
    assetContractType?: string;
    createdDate?: string;
    schemaName?: string;
    externalLink?: string;
}
/**
 * @type CollectibleMetadata
 *
 * Collectible custom information
 *
 * @property name - Collectible custom name
 * @property description - The collectible description
 * @property numberOfSales - Number of sales
 * @property backgroundColor - The background color to be displayed with the item
 * @property image - Image custom image URI
 * @property imagePreview - URI of a smaller image associated with this collectible
 * @property imageThumbnail - URI of a thumbnail image associated with this collectible
 * @property imageOriginal - URI of the original image associated with this collectible
 * @property animation - URI of a animation associated with this collectible
 * @property animationOriginal - URI of the original animation associated with this collectible
 * @property externalLink - External link containing additional information
 * @property creator - The collectible owner information object
 */
export interface CollectibleMetadata {
    name?: string;
    description?: string;
    numberOfSales?: number;
    backgroundColor?: string;
    image?: string;
    imagePreview?: string;
    imageThumbnail?: string;
    imageOriginal?: string;
    animation?: string;
    animationOriginal?: string;
    externalLink?: string;
    creator?: ApiCollectibleCreator;
    lastSale?: ApiCollectibleLastSale;
}
/**
 * @type CollectiblesConfig
 *
 * Collectibles controller configuration
 *
 * @property networkType - Network ID as per net_version
 * @property selectedAddress - Vault selected address
 */
export interface CollectiblesConfig extends BaseConfig {
    networkType: NetworkType;
    selectedAddress: string;
    chainId: string;
}
/**
 * @type CollectiblesState
 *
 * Assets controller state
 *
 * @property allCollectibleContracts - Object containing collectibles contract information
 * @property allCollectibles - Object containing collectibles per account and network
 * @property collectibleContracts - List of collectibles contracts associated with the active vault
 * @property collectibles - List of collectibles associated with the active vault
 * @property ignoredCollectibles - List of collectibles that should be ignored
 */
export interface CollectiblesState extends BaseState {
    allCollectibleContracts: {
        [key: string]: {
            [key: string]: CollectibleContract[];
        };
    };
    allCollectibles: {
        [key: string]: {
            [key: string]: Collectible[];
        };
    };
    collectibleContracts: CollectibleContract[];
    collectibles: Collectible[];
    ignoredCollectibles: Collectible[];
}
/**
 * Controller that stores assets and exposes convenience methods
 */
export declare class CollectiblesController extends BaseController<CollectiblesConfig, CollectiblesState> {
    private mutex;
    private getCollectibleApi;
    private getCollectibleContractInformationApi;
    /**
     * Request individual collectible information from OpenSea api
     *
     * @param contractAddress - Hex address of the collectible contract
     * @param tokenId - The collectible identifier
     * @returns - Promise resolving to the current collectible name and image
     */
    private getCollectibleInformationFromApi;
    /**
     * Request individual collectible information from contracts that follows Metadata Interface
     *
     * @param contractAddress - Hex address of the collectible contract
     * @param tokenId - The collectible identifier
     * @returns - Promise resolving to the current collectible name and image
     */
    private getCollectibleInformationFromTokenURI;
    /**
     * Request individual collectible information (name, image url and description)
     *
     * @param contractAddress - Hex address of the collectible contract
     * @param tokenId - The collectible identifier
     * @returns - Promise resolving to the current collectible name and image
     */
    private getCollectibleInformation;
    /**
     * Request collectible contract information from OpenSea api
     *
     * @param contractAddress - Hex address of the collectible contract
     * @returns - Promise resolving to the current collectible name and image
     */
    private getCollectibleContractInformationFromApi;
    /**
     * Request collectible contract information from the contract itself
     *
     * @param contractAddress - Hex address of the collectible contract
     * @returns - Promise resolving to the current collectible name and image
     */
    private getCollectibleContractInformationFromContract;
    /**
     * Request collectible contract information from OpenSea api
     *
     * @param contractAddress - Hex address of the collectible contract
     * @returns - Promise resolving to the collectible contract name, image and description
     */
    private getCollectibleContractInformation;
    /**
     * Adds an individual collectible to the stored collectible list
     *
     * @param address - Hex address of the collectible contract
     * @param tokenId - The collectible identifier
     * @param opts - Collectible optional information (name, image and description)
     * @returns - Promise resolving to the current collectible list
     */
    private addIndividualCollectible;
    /**
     * Adds a collectible contract to the stored collectible contracts list
     *
     * @param address - Hex address of the collectible contract
     * @param detection? - Whether the collectible is manually added or auto-detected
     * @returns - Promise resolving to the current collectible contracts list
     */
    private addCollectibleContract;
    /**
     * Removes an individual collectible from the stored token list and saves it in ignored collectibles list
     *
     * @param address - Hex address of the collectible contract
     * @param tokenId - Token identifier of the collectible
     */
    private removeAndIgnoreIndividualCollectible;
    /**
     * Removes an individual collectible from the stored token list
     *
     * @param address - Hex address of the collectible contract
     * @param tokenId - Token identifier of the collectible
     */
    private removeIndividualCollectible;
    /**
     * Removes a collectible contract to the stored collectible contracts list
     *
     * @param address - Hex address of the collectible contract
     * @returns - Promise resolving to the current collectible contracts list
     */
    private removeCollectibleContract;
    /**
     * EventEmitter instance used to listen to specific EIP747 events
     */
    hub: EventEmitter;
    /**
     * Optional API key to use with opensea
     */
    openSeaApiKey?: string;
    /**
     * Name of this controller used during composition
     */
    name: string;
    private getAssetName;
    private getAssetSymbol;
    private getCollectibleTokenURI;
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
    constructor({ onPreferencesStateChange, onNetworkStateChange, getAssetName, getAssetSymbol, getCollectibleTokenURI, }: {
        onPreferencesStateChange: (listener: (preferencesState: PreferencesState) => void) => void;
        onNetworkStateChange: (listener: (networkState: NetworkState) => void) => void;
        getAssetName: AssetsContractController['getAssetName'];
        getAssetSymbol: AssetsContractController['getAssetSymbol'];
        getCollectibleTokenURI: AssetsContractController['getCollectibleTokenURI'];
    }, config?: Partial<BaseConfig>, state?: Partial<CollectiblesState>);
    /**
     * Sets an OpenSea API key to retrieve collectible information
     *
     * @param openSeaApiKey - OpenSea API key
     */
    setApiKey(openSeaApiKey: string): void;
    /**
     * Adds a collectible and respective collectible contract to the stored collectible and collectible contracts lists
     *
     * @param address - Hex address of the collectible contract
     * @param tokenId - The collectible identifier
     * @param collectibleMetadata - Collectible optional metadata
     * @param detection? - Whether the collectible is manually added or autodetected
     * @returns - Promise resolving to the current collectible list
     */
    addCollectible(address: string, tokenId: number, collectibleMetadata?: CollectibleMetadata, detection?: boolean): Promise<void>;
    /**
     * Removes a collectible from the stored token list
     *
     * @param address - Hex address of the collectible contract
     * @param tokenId - Token identifier of the collectible
     */
    removeCollectible(address: string, tokenId: number): void;
    /**
     * Removes a collectible from the stored token list and saves it in ignored collectibles list
     *
     * @param address - Hex address of the collectible contract
     * @param tokenId - Token identifier of the collectible
     */
    removeAndIgnoreCollectible(address: string, tokenId: number): void;
    /**
     * Removes all collectibles from the ignored list
     */
    clearIgnoredCollectibles(): void;
}
export default CollectiblesController;