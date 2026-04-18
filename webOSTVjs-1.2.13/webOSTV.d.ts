// Type definitions for webOSTV.js and webOSTV-dev.js 1.2.13
// Derived from the vendored LG webOS TV JS library (Apache-2.0).
// Both scripts are UMD/IIFE bundles that attach to window.webOS / window.webOSDev.

export {};

declare global {
  interface Window {
    webOS: typeof webOS;
    webOSDev: typeof webOSDev;
    PalmSystem?: PalmSystem;
    PalmServiceBridge?: PalmServiceBridgeConstructor;
    Mojo?: { relaunch: () => void };
  }

  // ───────────────────────────────────────────────────────────────
  // webOSTV.js  (window.webOS)
  // ───────────────────────────────────────────────────────────────
  namespace webOS {
    const libVersion: string;

    /** Platform detection flags populated on script load. */
    const platform: Platform;

    interface Platform {
      tv?: boolean;
      watch?: boolean;
      legacy?: boolean;
      open?: boolean;
      unknown?: boolean;
      /** Chrome major version (0 if not Chrome, absent if non-Palm env). */
      chrome?: number;
    }

    /** Returns the running app's identifier, or an empty string off-device. */
    function fetchAppId(): string;

    /** Returns the app root path resolved from document.baseURI or the first `<base>` tag. */
    function fetchAppRootPath(): string;

    /**
     * Loads and parses appinfo.json, invoking `callback` with the parsed object
     * on success or no arguments on failure.
     */
    function fetchAppInfo(
      callback?: (info?: AppInfo) => void,
      path?: string,
    ): void;

    interface AppInfo {
      id?: string;
      version?: string;
      vendor?: string;
      type?: string;
      main?: string;
      title?: string;
      icon?: string;
      [key: string]: unknown;
    }

    /** Asks PalmSystem to navigate back (hardware Back button equivalent). */
    function platformBack(): void;

    const keyboard: {
      /** True while the virtual keyboard is visible, undefined off-device. */
      isShowing(): boolean | undefined;
    };

    /**
     * Reads locale + timezone metadata from PalmSystem. Returns an empty object
     * off-device.
     */
    function systemInfo(): SystemInfo;

    interface SystemInfo {
      country?: string;
      smartServiceCountry?: string;
      timezone?: string;
    }

    /**
     * Fetches device info via luna services. The callback receives an object
     * populated progressively as sub-requests resolve — check field presence
     * before use.
     */
    function deviceInfo(callback: (info: DeviceInfo) => void): void;

    interface DeviceInfo {
      modelName?: string;
      version?: string;
      versionMajor?: number | string;
      versionMinor?: number | string;
      versionDot?: number | string;
      sdkVersion?: string;
      screenWidth?: number;
      screenHeight?: number;
      uhd?: boolean;
      uhd8K?: boolean;
      oled?: boolean;
      ddrSize?: string;
      hdr10?: boolean;
      dolbyVision?: boolean;
      dolbyAtmos?: boolean;
      brandName?: string;
      manufacturer?: string;
      mainboardMaker?: string;
      platformBizType?: string;
      tuner?: boolean;
      [key: string]: unknown;
    }

    const service: {
      /**
       * Issues a luna bus request. `service` is the luna URI
       * (e.g. `"luna://com.webos.service.tv.systemproperty"`); options carry
       * the method name, parameters, and callbacks.
       */
      request(service: string, options?: ServiceRequestOptions): ServiceRequest;
    };

    interface ServiceRequestOptions {
      method?: string;
      parameters?: Record<string, unknown>;
      onSuccess?: (response: ServiceResponse) => void;
      onFailure?: (response: ServiceResponse) => void;
      onComplete?: (response: ServiceResponse) => void;
      subscribe?: boolean;
      resubscribe?: boolean;
    }

    /**
     * Generic luna bus response. `returnValue` reflects success. On failure
     * the library populates `errorCode` / `errorText`; subscribed calls emit
     * repeatedly until `cancel()` is called.
     */
    interface ServiceResponse {
      returnValue: boolean;
      errorCode?: number | string;
      errorText?: string;
      subscribed?: boolean;
      [key: string]: unknown;
    }

    interface ServiceRequest {
      /** Cancels the underlying PalmServiceBridge call and stops subscriptions. */
      cancel(): void;
      readonly subscribe: boolean;
      readonly cancelled: boolean;
    }
  }

  // ───────────────────────────────────────────────────────────────
  // webOSTV-dev.js  (window.webOSDev)
  // ───────────────────────────────────────────────────────────────
  namespace webOSDev {
    const APP: {
      /** Reserved id for the system browser app. */
      readonly BROWSER: 'APP_BROWSER';
    };

    /**
     * Launches another installed app. Pass `webOSDev.APP.BROWSER` as `id`
     * with `params.target` set to a URL to open a web page.
     */
    function launch(options: LaunchOptions): void;

    interface LaunchOptions {
      id: string;
      params?: Record<string, unknown> & { target?: string };
      onSuccess?: () => void;
      onFailure?: (err: { errorCode?: number | string; errorText?: string }) => void;
    }

    /** Returns the JSON-parsed launchParams supplied by PalmSystem, or `{}`. */
    function launchParams(): Record<string, unknown>;

    const connection: {
      getStatus(options: ConnectionStatusOptions): void;
    };

    interface ConnectionStatusOptions {
      subscribe?: boolean;
      onSuccess?: (status: ConnectionStatus) => void;
      onFailure?: (err: { errorCode?: number | string; errorText?: string }) => void;
    }

    interface ConnectionStatus {
      isInternetConnectionAvailable?: boolean;
      wired?: Record<string, unknown>;
      wifi?: Record<string, unknown>;
      wifiDirect?: Record<string, unknown>;
      [key: string]: unknown;
    }

    /**
     * Fetches the LG Unique Device Identifier on supported (Chromium) devices.
     * Fails with `ERROR.000` on unsupported environments.
     */
    function LGUDID(options: {
      onSuccess?: (result: { id: string }) => void;
      onFailure?: (err: { errorCode?: number | string; errorText?: string }) => void;
    }): void;

    /**
     * Returns a DRM client for the given type, or null when `type` is empty.
     * The client lifecycle is load → sendDrmMessage / getRightsError → unload.
     */
    function drmAgent(type: DrmType | ''): DrmClient | null;

    type DrmType = 'playready' | 'widevine';

    const DRM: {
      readonly Type: {
        readonly PLAYREADY: 'playready';
        readonly WIDEVINE: 'widevine';
      };
      readonly Error: {
        readonly NOT_ERROR: -1;
        readonly CLIENT_NOT_LOADED: 0;
        readonly VENDOR_ERROR: 500;
        readonly API_NOT_SUPPORTED: 501;
        readonly WRONG_CLIENT_ID: 502;
        readonly KEY_NOT_FOUND: 503;
        readonly INVALID_PARAMS: 504;
        readonly UNSUPPORTED_DRM_TYPE: 505;
        readonly INVALID_KEY_FORMAT: 506;
        readonly INVALID_TIME_INFO: 507;
        readonly UNKNOWN_ERROR: 599;
      };
    };

    interface DrmError {
      errorCode: number;
      errorText: string;
    }

    interface DrmCallbacks<TSuccess> {
      onSuccess?: (result: TSuccess) => void;
      onFailure?: (err: DrmError) => void;
    }

    interface DrmClient {
      getClientId(): string;
      getDrmType(): DrmType;
      getErrorCode(): number;
      getErrorText(): string;

      isLoaded(
        options: DrmCallbacks<{ isLoaded?: boolean; clientId?: string; loadStatus?: boolean }>,
      ): void;
      load(options: DrmCallbacks<{ clientId: string }>): void;
      unload(options: DrmCallbacks<void>): void;

      /** Subscribes to rights errors for the current client session. */
      getRightsError(
        options: DrmCallbacks<{ errorCode?: number; errorText?: string; [key: string]: unknown }>,
      ): void;

      sendDrmMessage(
        options: DrmCallbacks<Record<string, unknown>> & { msg?: string },
      ): void;
    }
  }

  // ───────────────────────────────────────────────────────────────
  // Host globals consumed by the library
  // ───────────────────────────────────────────────────────────────
  interface PalmSystem {
    identifier?: string;
    deviceInfo?: string;
    country?: string;
    timeZone?: string;
    launchParams?: string;
    isKeyboardVisible?: boolean;
    platformBack?: () => void;
    stageReady?: () => void;
  }

  interface PalmServiceBridgeInstance {
    onservicecallback: ((response: string) => void) | null;
    call(uri: string, payload: string): void;
    cancel(): void;
  }

  interface PalmServiceBridgeConstructor {
    new (): PalmServiceBridgeInstance;
  }
}
