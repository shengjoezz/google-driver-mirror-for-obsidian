const {
  Plugin,
  Notice,
  PluginSettingTab,
  Setting,
  Modal,
  TFile,
  Platform,
  normalizePath,
  requestUrl,
  arrayBufferToHex,
  debounce,
} = require("obsidian");
const QRCode = require("qrcode");

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const GOOGLE_SCOPE_DRIVE_FILE = "https://www.googleapis.com/auth/drive.file";
const AUTH_SCOPES = [GOOGLE_SCOPE_DRIVE_FILE];
const TOKEN_SECRET_ID = "google-drive-mirror-visible-folder-auth";
const LOOPBACK_HOST = "127.0.0.1";
const LOOPBACK_PATH = "/oauth2callback";
const LOOPBACK_TIMEOUT_MS = 3 * 60 * 1000;
const REMOTE_MANIFEST_VERSION = 1;
const STORAGE_PROVIDER_VERSION = "gdrive-visible-folder-v1";
const REMOTE_MANIFEST_NAME = ".gdrive-mirror-manifest.json";
const REMOTE_CONFLICTS_DIR = "conflicts";
const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const SETUP_BUNDLE_VERSION = 1;
const IMPORT_BUNDLE_ACTION = "google-drive-mirror-import-bundle";
const DEFAULT_INCLUDE_EXTENSIONS = [
  "md",
  "markdown",
  "canvas",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "pdf",
  "json",
  "css",
  "js",
  "txt",
  "yaml",
  "yml",
].join(", ");
const DEFAULT_OBSIDIAN_ALLOWLIST = [
  "app.json",
  "appearance.json",
  "community-plugins.json",
  "core-plugins.json",
  "hotkeys.json",
].join("\n");
const DEFAULT_EXCLUDED_PREFIXES = [".trash"].join("\n");
const TEXT_EXTENSIONS = new Set([
  "md",
  "markdown",
  "canvas",
  "json",
  "css",
  "js",
  "txt",
  "yaml",
  "yml",
  "svg",
]);

const DEFAULT_SETTINGS = {
  storageProviderVersion: STORAGE_PROVIDER_VERSION,
  clientId: "",
  clientSecret: "",
  deviceLabel: "",
  remoteVaultName: "",
  includeExtensions: DEFAULT_INCLUDE_EXTENSIONS,
  excludedPathPrefixes: DEFAULT_EXCLUDED_PREFIXES,
  autoPullOnStartup: false,
  autoPushAfterSave: false,
  syncObsidianFiles: false,
  obsidianAllowlist: DEFAULT_OBSIDIAN_ALLOWLIST,
  storedTokensFallback: null,
  lastAuthError: "",
  lastLocalManifest: {},
  lastRemoteManifest: {},
  lastSyncAt: null,
  lastSyncDevice: "",
  lastSyncAction: "",
  lastRemoteFolderId: "",
};

module.exports = class GoogleDriveMirrorPlugin extends Plugin {
  async onload() {
    this.operationLabel = null;
    this.authSession = null;
    this.pendingAuthPromise = null;
    this.cachedTokens = null;
    this.remoteRootFolderCache = null;
    this.progressNotice = null;
    this.progressMessage = "";
    this.suppressAutoPush = false;
    this.statusBar = this.addStatusBarItem();

    await this.loadSettings();
    this.settingTab = new GoogleDriveMirrorSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);
    this.autoPushDebounced = debounce(async () => {
      await this.pushAllChanges({ silent: true, reason: "auto-save" });
    }, 5000, true);

    this.addRibbonIcon("cloud-upload", "Push all local changes to Google Drive", async () => {
      await this.pushAllChanges();
    });

    this.addCommand({
      id: "google-drive-start-sign-in",
      name: "Start Google Drive sign-in",
      callback: async () => {
        await this.beginSignIn();
      },
    });

    this.addCommand({
      id: "google-drive-push-active-file",
      name: "Push current file to Google Drive",
      callback: async () => {
        await this.pushActiveFile();
      },
    });

    this.addCommand({
      id: "google-drive-push-all",
      name: "Push all local changes to Google Drive",
      callback: async () => {
        await this.pushAllChanges();
      },
    });

    this.addCommand({
      id: "google-drive-pull-all",
      name: "Pull remote changes from Google Drive",
      callback: async () => {
        await this.pullRemoteChanges();
      },
    });

    this.addCommand({
      id: "google-drive-clear-auth",
      name: "Clear Google Drive sign-in",
      callback: async () => {
        await this.clearStoredTokens();
        new Notice("Google Drive sign-in cleared.");
      },
    });

    this.addCommand({
      id: "google-drive-open-remote-folder",
      name: "Open remote Google Drive folder",
      callback: async () => {
        this.openRemoteFolderUrl();
      },
    });

    this.addCommand({
      id: "google-drive-copy-setup-bundle",
      name: "Copy Google Drive setup bundle",
      callback: async () => {
        await this.copySetupBundle();
      },
    });

    this.addCommand({
      id: "google-drive-import-setup-bundle",
      name: "Import Google Drive setup bundle",
      callback: async () => {
        await this.openImportSetupBundleModal();
      },
    });

    this.addCommand({
      id: "google-drive-show-setup-bundle-qr",
      name: "Show Google Drive setup bundle QR",
      callback: async () => {
        await this.showSetupBundleQr();
      },
    });

    this.registerObsidianProtocolHandler(IMPORT_BUNDLE_ACTION, async (params) => {
      try {
        await this.handleImportBundleProtocol(params);
      } catch (error) {
        new Notice(this.formatError(error), 10000);
      }
    });

    this.registerVaultAutoPushHandlers();
    this.app.workspace.onLayoutReady(() => {
      void this.handleStartupAutoPull();
    });

    this.setStatus("idle");
  }

  onunload() {
    if (this.authSession) {
      this.authSession.close();
      this.authSession = null;
    }
    this.autoPushDebounced?.cancel?.();
    this.hideProgressNotice();
  }

  async loadSettings() {
    const loaded = (await this.loadData()) || {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
    if (!this.settings.deviceLabel) {
      this.settings.deviceLabel = this.defaultDeviceLabel();
    }
    this.cachedTokens = this.settings.storedTokensFallback || null;
    this.remoteRootFolderCache = null;

    if (loaded.storageProviderVersion !== STORAGE_PROVIDER_VERSION) {
      this.settings.storageProviderVersion = STORAGE_PROVIDER_VERSION;
      this.settings.storedTokensFallback = null;
      this.settings.lastAuthError = "";
      this.settings.lastLocalManifest = {};
      this.settings.lastRemoteManifest = {};
      this.settings.lastSyncAt = null;
      this.settings.lastRemoteFolderId = "";
      this.cachedTokens = null;
    }

    if (!this.settings.remoteVaultName) {
      this.settings.remoteVaultName = this.defaultRemoteVaultName();
      await this.saveSettings();
      return;
    }

    const sanitizedRemoteVaultName = sanitizeDriveFolderName(this.settings.remoteVaultName);
    if (sanitizedRemoteVaultName !== this.settings.remoteVaultName) {
      this.settings.remoteVaultName = sanitizedRemoteVaultName;
      this.settings.lastRemoteFolderId = "";
      await this.saveSettings();
      return;
    }

    if (loaded.storageProviderVersion !== STORAGE_PROVIDER_VERSION) {
      await this.saveSettings();
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  refreshSettingsUi() {
    if (this.settingTab) {
      this.settingTab.display();
    }
  }

  async rememberRemoteRootFolder(folderId, folderName) {
    if (!folderId) {
      return;
    }

    this.remoteRootFolderCache = {
      id: folderId,
      name: folderName || this.getRemoteRootFolderName(),
    };

    if (this.settings.lastRemoteFolderId === folderId) {
      return;
    }

    this.settings.lastRemoteFolderId = folderId;
    await this.saveSettings();
    this.refreshSettingsUi();
  }

  getRemoteFolderUrl() {
    const folderId = this.settings.lastRemoteFolderId || this.remoteRootFolderCache?.id || "";
    return folderId ? `https://drive.google.com/drive/folders/${folderId}` : "";
  }

  openRemoteFolderUrl() {
    const url = this.getRemoteFolderUrl();
    if (!url) {
      throw new Error("The remote Drive folder has not been created yet. Push once first.");
    }
    this.openExternalUrl(url);
  }

  setStatus(label) {
    const suffix = this.progressMessage || (this.operationLabel ? this.operationLabel : label);
    this.statusBar.setText(`Google Drive Mirror: ${suffix}`);
  }

  defaultRemoteVaultName() {
    const name = (this.app.vault.getName() || "default-vault").trim();
    return name.replace(/[\\/:*?"<>|]/g, "-") || "default-vault";
  }

  defaultDeviceLabel() {
    return inferDefaultDeviceLabel();
  }

  async runOperation(label, fn) {
    if (this.operationLabel) {
      new Notice(`Google Drive Mirror is busy: ${this.operationLabel}`);
      return;
    }

    this.operationLabel = label;
    this.setStatus(label);

    try {
      return await fn();
    } catch (error) {
      console.error("Google Drive Mirror error", error);
      new Notice(this.formatError(error), 8000);
      throw error;
    } finally {
      this.hideProgressNotice();
      this.operationLabel = null;
      this.progressMessage = "";
      this.setStatus("idle");
      this.refreshSettingsUi();
    }
  }

  showProgressNotice(message, silent) {
    if (silent) {
      return;
    }

    if (!this.progressNotice) {
      this.progressNotice = new Notice(message, 0);
      return;
    }

    this.progressNotice.setMessage(message);
  }

  updateProgress(label, current, total, detail, silent) {
    const safeTotal = Number(total || 0);
    const safeCurrent = Number(current || 0);
    let progressLabel = label;

    if (safeTotal > 0) {
      const percentage = Math.min(100, Math.round((safeCurrent / safeTotal) * 100));
      progressLabel = `${label} ${safeCurrent}/${safeTotal} (${percentage}%)`;
    }

    if (detail) {
      progressLabel = `${progressLabel} - ${detail}`;
    }

    this.progressMessage = progressLabel;
    this.setStatus(progressLabel);
    this.showProgressNotice(progressLabel, silent);
  }

  hideProgressNotice() {
    if (this.progressNotice) {
      this.progressNotice.hide();
      this.progressNotice = null;
    }
  }

  recordSyncMetadata(action) {
    this.settings.lastSyncAt = new Date().toISOString();
    this.settings.lastSyncDevice = this.settings.deviceLabel || this.defaultDeviceLabel();
    this.settings.lastSyncAction = action;
  }

  hasUsableAuth() {
    return Boolean(this.settings.clientId.trim() && this.loadStoredTokens()?.accessToken);
  }

  registerVaultAutoPushHandlers() {
    const queueAutoPush = () => {
      if (!this.settings.autoPushAfterSave || this.suppressAutoPush || !this.hasUsableAuth()) {
        return;
      }

      this.progressMessage = "auto push queued";
      this.setStatus("auto push queued");
      this.autoPushDebounced();
    };

    this.registerEvent(this.app.vault.on("create", () => queueAutoPush()));
    this.registerEvent(this.app.vault.on("modify", () => queueAutoPush()));
    this.registerEvent(this.app.vault.on("delete", () => queueAutoPush()));
    this.registerEvent(this.app.vault.on("rename", () => queueAutoPush()));
  }

  async handleStartupAutoPull() {
    if (!this.settings.autoPullOnStartup || !this.hasUsableAuth()) {
      return;
    }

    await this.pullRemoteChanges({ silent: true, reason: "startup" });
  }

  async beginSignIn() {
    await this.requireConfigured(true);

    if (!Platform.isDesktopApp) {
      throw new Error(
        "Google Drive sign-in currently supports the desktop app only. On iPhone/iPad, import a setup bundle exported from your desktop device."
      );
    }

    if (this.authSession) {
      throw new Error("A Google sign-in flow is already waiting for the browser callback.");
    }

    const verifier = createPkceVerifier();
    const challenge = await createPkceChallenge(verifier);
    const state = createRandomToken(24);
    const authSession = await this.createLoopbackAuthSession();

    this.authSession = authSession;
    this.pendingAuthPromise = (async () => {
      this.openExternalUrl(
        this.buildAuthorizeUrl(state, challenge, authSession.redirectUri)
      );

      new Notice(
        "Google sign-in opened in your browser. Complete the consent flow there; the plugin is waiting for the localhost callback.",
        12000
      );

      try {
        const params = await authSession.waitForCallback();
        await this.finishSignIn(params, verifier, state, authSession.redirectUri);
        new Notice("Google Drive sign-in completed.");
      } finally {
        authSession.close();
        if (this.authSession === authSession) {
          this.authSession = null;
        }
      }
    })();

    try {
      await this.pendingAuthPromise;
    } catch (error) {
      this.settings.lastAuthError = this.formatError(error);
      await this.saveSettings();
      new Notice(this.settings.lastAuthError, 10000);
      throw error;
    } finally {
      this.pendingAuthPromise = null;
    }
  }

  openExternalUrl(url) {
    try {
      const { shell } = require("electron");
      if (shell && typeof shell.openExternal === "function") {
        shell.openExternal(url);
        return;
      }
    } catch (_error) {
      // Fall back to the browser window API below.
    }

    window.open(url, "_blank");
  }

  buildAuthorizeUrl(state, challenge, redirectUri) {
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", this.settings.clientId.trim());
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", AUTH_SCOPES.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    return url.toString();
  }

  async createLoopbackAuthSession() {
    const http = require("node:http");
    let timer = null;
    let server = null;
    let settled = false;
    let callbackResolve = null;
    let callbackReject = null;

    const callbackPromise = new Promise((resolve, reject) => {
      callbackResolve = resolve;
      callbackReject = reject;
    });

    const close = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (server && server.listening) {
        server.close();
      }
    };

    const settleSuccess = (params) => {
      if (settled) {
        return;
      }
      settled = true;
      close();
      callbackResolve(params);
    };

    const settleError = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      close();
      callbackReject(error);
    };

    const redirectUri = await new Promise((resolve, reject) => {
      server = http.createServer((request, response) => {
        try {
          const requestUrl = new URL(
            request.url || "/",
            `http://${LOOPBACK_HOST}`
          );

          if (requestUrl.pathname !== LOOPBACK_PATH) {
            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Not found.");
            return;
          }

          const params = {};
          requestUrl.searchParams.forEach((value, key) => {
            params[key] = value;
          });

          const success = !params.error;
          response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          response.end(buildLoopbackCallbackHtml(success));

          settleSuccess(params);
        } catch (error) {
          response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Authorization callback parsing failed.");
          settleError(error);
        }
      });

      server.on("error", (error) => {
        reject(error);
      });

      server.listen(0, LOOPBACK_HOST, () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          reject(new Error("Failed to create the Google OAuth loopback listener."));
          return;
        }

        resolve(`http://${LOOPBACK_HOST}:${address.port}${LOOPBACK_PATH}`);
      });
    });

    timer = setTimeout(() => {
      settleError(
        new Error("Google sign-in timed out before the browser returned to localhost.")
      );
    }, LOOPBACK_TIMEOUT_MS);

    return {
      redirectUri,
      waitForCallback: () => callbackPromise,
      close,
    };
  }

  async finishSignIn(params, verifier, expectedState, redirectUri) {
    if (params.error) {
      throw new Error(params.error_description || params.error);
    }

    if (!params.code) {
      throw new Error("Google did not return an authorization code.");
    }

    if (params.state !== expectedState) {
      throw new Error("OAuth state mismatch. Start sign-in again.");
    }

    const tokenSet = await this.exchangeCodeForTokens(params.code, verifier, redirectUri);
    await this.saveStoredTokens(tokenSet);
    this.settings.lastAuthError = "";
    await this.saveSettings();
  }

  async exchangeCodeForTokens(code, verifier, redirectUri) {
    const params = {
      client_id: this.settings.clientId.trim(),
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    };

    if (this.settings.clientSecret.trim()) {
      params.client_secret = this.settings.clientSecret.trim();
    }

    const body = new URLSearchParams(params).toString();

    const response = await requestUrl({
      url: GOOGLE_TOKEN_URL,
      method: "POST",
      contentType: "application/x-www-form-urlencoded",
      body,
      throw: false,
    });

    if (response.status >= 400) {
      throw new Error(extractHttpError(response));
    }

    return buildStoredTokenPayload(parseJsonResponse(response));
  }

  async refreshTokens(refreshToken) {
    const params = {
      client_id: this.settings.clientId.trim(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    };

    if (this.settings.clientSecret.trim()) {
      params.client_secret = this.settings.clientSecret.trim();
    }

    const body = new URLSearchParams(params).toString();

    const response = await requestUrl({
      url: GOOGLE_TOKEN_URL,
      method: "POST",
      contentType: "application/x-www-form-urlencoded",
      body,
      throw: false,
    });

    if (response.status >= 400) {
      throw new Error(extractHttpError(response));
    }

    const refreshed = buildStoredTokenPayload(parseJsonResponse(response));
    if (!refreshed.refreshToken) {
      refreshed.refreshToken = refreshToken;
    }
    await this.saveStoredTokens(refreshed);
    return refreshed;
  }

  async saveStoredTokens(tokenSet) {
    if (!tokenSet || !tokenSet.accessToken) {
      throw new Error("Google OAuth token exchange did not return an access token.");
    }

    this.cachedTokens = tokenSet || null;
    this.settings.storedTokensFallback = tokenSet || null;

    if (this.app.secretStorage) {
      try {
        this.app.secretStorage.setSecret(TOKEN_SECRET_ID, JSON.stringify(tokenSet || {}));
      } catch (error) {
        console.error("Failed to store Google token in secretStorage", error);
      }
    }

    await this.saveSettings();
    this.refreshSettingsUi();
  }

  loadStoredTokens() {
    if (this.cachedTokens && this.cachedTokens.accessToken) {
      return this.cachedTokens;
    }

    if (!this.app.secretStorage) {
      return null;
    }

    const raw = this.app.secretStorage.getSecret(TOKEN_SECRET_ID);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      this.cachedTokens = parsed;
      return parsed;
    } catch (_error) {
      return this.settings.storedTokensFallback || null;
    }
  }

  async clearStoredTokens() {
    this.cachedTokens = null;
    this.settings.storedTokensFallback = null;
    this.settings.lastAuthError = "";
    if (this.app.secretStorage) {
      this.app.secretStorage.setSecret(TOKEN_SECRET_ID, "");
    }
    await this.saveSettings();
    this.refreshSettingsUi();
  }

  buildSetupBundle() {
    const storedTokens = this.loadStoredTokens();
    if (!storedTokens || !storedTokens.refreshToken) {
      throw new Error("Sign in on desktop first, then export the setup bundle.");
    }

    return {
      version: SETUP_BUNDLE_VERSION,
      provider: "google-drive-mirror",
      exportedAt: new Date().toISOString(),
      config: {
        clientId: this.settings.clientId,
        clientSecret: this.settings.clientSecret,
        remoteVaultName: this.settings.remoteVaultName,
        includeExtensions: this.settings.includeExtensions,
        excludedPathPrefixes: this.settings.excludedPathPrefixes,
        syncObsidianFiles: this.settings.syncObsidianFiles,
        obsidianAllowlist: this.settings.obsidianAllowlist,
      },
      tokens: storedTokens,
    };
  }

  buildSetupBundlePayload(pretty) {
    return JSON.stringify(this.buildSetupBundle(), null, pretty ? 2 : 0);
  }

  buildSetupBundleImportUrl() {
    const encodedBundle = base64UrlEncodeUtf8(this.buildSetupBundlePayload(false));
    return `obsidian://${IMPORT_BUNDLE_ACTION}?bundle=${encodeURIComponent(encodedBundle)}`;
  }

  async copySetupBundle() {
    const payload = this.buildSetupBundlePayload(true);

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        new Notice("Google Drive setup bundle copied to clipboard.", 8000);
        return;
      }
    } catch (error) {
      console.warn("Clipboard copy failed, falling back to modal.", error);
    }

    new SetupBundleExportModal(this.app, payload).open();
  }

  async showSetupBundleQr() {
    const url = this.buildSetupBundleImportUrl();
    const dataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
    });
    new SetupBundleQrModal(this.app, dataUrl, url).open();
  }

  async openImportSetupBundleModal() {
    new SetupBundleImportModal(this.app, async (raw) => {
      await this.importSetupBundle(raw);
    }).open();
  }

  async importSetupBundle(raw) {
    let parsed = null;
    try {
      parsed = JSON.parse(String(raw || ""));
    } catch (_error) {
      throw new Error("The setup bundle is not valid JSON.");
    }

    if (!parsed || parsed.provider !== "google-drive-mirror") {
      throw new Error("The setup bundle is not for Google Drive Mirror.");
    }

    if (Number(parsed.version || 0) !== SETUP_BUNDLE_VERSION) {
      throw new Error("Unsupported setup bundle version.");
    }

    const config = parsed.config || {};
    const tokens = normalizeImportedTokenSet(parsed.tokens || {});

    if (!config.clientId || !tokens.accessToken || !tokens.refreshToken) {
      throw new Error("The setup bundle is missing client or token data.");
    }

    this.settings.clientId = String(config.clientId || "").trim();
    this.settings.clientSecret = String(config.clientSecret || "").trim();
    this.settings.remoteVaultName = sanitizeDriveFolderName(
      String(config.remoteVaultName || this.defaultRemoteVaultName())
    );
    this.settings.includeExtensions = String(
      config.includeExtensions || DEFAULT_INCLUDE_EXTENSIONS
    );
    this.settings.excludedPathPrefixes = String(
      config.excludedPathPrefixes || DEFAULT_EXCLUDED_PREFIXES
    );
    this.settings.syncObsidianFiles = Boolean(config.syncObsidianFiles);
    this.settings.obsidianAllowlist = String(
      config.obsidianAllowlist || DEFAULT_OBSIDIAN_ALLOWLIST
    );
    this.settings.lastRemoteFolderId = "";
    this.remoteRootFolderCache = null;

    await this.saveStoredTokens(tokens);
    this.settings.lastAuthError = "";
    await this.saveSettings();
    this.refreshSettingsUi();
    new Notice("Google Drive setup bundle imported.", 8000);
  }

  async handleImportBundleProtocol(params) {
    const encodedBundle = String(params?.bundle || "").trim();
    if (!encodedBundle) {
      throw new Error("Import link is missing the setup bundle payload.");
    }

    const bundlePayload = base64UrlDecodeUtf8(decodeURIComponent(encodedBundle));
    await this.importSetupBundle(bundlePayload);
  }

  async getValidAccessToken(forceRefresh) {
    if (this.pendingAuthPromise) {
      await this.pendingAuthPromise;
    }

    const stored = this.loadStoredTokens();
    if (!stored || !stored.accessToken) {
      throw new Error("You are not signed in to Google Drive.");
    }

    const expiresAt = Number(stored.expiresAt || 0);
    const needsRefresh =
      forceRefresh || !expiresAt || Date.now() >= expiresAt - 60 * 1000;

    if (!needsRefresh) {
      return stored.accessToken;
    }

    if (!stored.refreshToken) {
      throw new Error("Refresh token is missing. Sign in again.");
    }

    const refreshed = await this.refreshTokens(stored.refreshToken);
    return refreshed.accessToken;
  }

  async requireConfigured(requireClientId) {
    if (requireClientId && !this.settings.clientId.trim()) {
      throw new Error("Set your Google OAuth Desktop App client ID in plugin settings first.");
    }
  }

  async pushActiveFile(options) {
    const runOptions = Object.assign({ silent: false, reason: "manual" }, options || {});
    await this.runOperation("pushing active file", async () => {
      await this.requireConfigured(true);

      const file = this.app.workspace.getActiveFile();
      if (!(file instanceof TFile)) {
        throw new Error("No active file to push.");
      }
      if (!this.shouldSyncPath(file.path)) {
        throw new Error("The active file is outside the current sync allow-list.");
      }

      const previousLocal = this.settings.lastLocalManifest[file.path] || null;
      const localEntry = await this.buildLocalEntry(file, previousLocal);
      const remoteManifest = await this.loadRemoteManifestOrScan();
      const remoteEntry = remoteManifest[file.path] || null;

      let uploaded = 0;
      this.updateProgress("Pushing current file", 0, 1, file.path, runOptions.silent);
      if (!remoteEntry || !sameRevision(localEntry, remoteEntry)) {
        remoteManifest[file.path] = await this.uploadLocalEntry(localEntry, remoteEntry);
        uploaded += 1;
      }
      this.updateProgress("Pushing current file", 1, 1, file.path, runOptions.silent);

      await this.saveRemoteManifest(remoteManifest);

      const currentLocal = await this.buildLocalManifest(this.settings.lastLocalManifest);
      this.settings.lastLocalManifest = currentLocal;
      this.settings.lastRemoteManifest = remoteManifest;
      this.recordSyncMetadata(
        runOptions.reason === "manual" ? "push current" : `push current (${runOptions.reason})`
      );
      await this.saveSettings();

      if (!runOptions.silent) {
        new Notice(`Push current file finished. Uploaded ${uploaded}.`);
      }
    });
  }

  async pushAllChanges(options) {
    const runOptions = Object.assign({ silent: false, reason: "manual" }, options || {});
    await this.runOperation("pushing local changes", async () => {
      await this.requireConfigured(true);

      const localManifest = await this.buildLocalManifest(this.settings.lastLocalManifest);
      const remoteManifest = await this.loadRemoteManifestOrScan();

      let uploaded = 0;
      let deleted = 0;
      const allPaths = new Set([
        ...Object.keys(localManifest),
        ...Object.keys(remoteManifest),
      ]);
      const total = allPaths.size;
      let processed = 0;

      if (total === 0) {
        this.updateProgress("Pushing", 0, 0, "nothing to sync", runOptions.silent);
      }

      for (const path of allPaths) {
        const localEntry = localManifest[path] || null;
        const remoteEntry = remoteManifest[path] || null;

        if (localEntry && (!remoteEntry || !sameRevision(localEntry, remoteEntry))) {
          remoteManifest[path] = await this.uploadLocalEntry(localEntry, remoteEntry);
          uploaded += 1;
          continue;
        }

        if (!localEntry && remoteEntry) {
          await this.deleteRemotePath(path, remoteEntry);
          delete remoteManifest[path];
          deleted += 1;
        }

        processed += 1;
        this.updateProgress("Pushing", processed, total, path, runOptions.silent);
      }

      await this.saveRemoteManifest(remoteManifest);

      this.settings.lastLocalManifest = localManifest;
      this.settings.lastRemoteManifest = remoteManifest;
      this.recordSyncMetadata(
        runOptions.reason === "manual" ? "push all" : `push all (${runOptions.reason})`
      );
      await this.saveSettings();

      if (!runOptions.silent) {
        new Notice(`Push finished. Uploaded ${uploaded}, deleted ${deleted}.`, 8000);
      }
    });
  }

  async pullRemoteChanges(options) {
    const runOptions = Object.assign({ silent: false, reason: "manual" }, options || {});
    await this.runOperation("pulling remote changes", async () => {
      await this.requireConfigured(true);

      const localManifest = await this.buildLocalManifest(this.settings.lastLocalManifest);
      const remoteManifest = await this.loadRemoteManifestOrScan();

      let downloaded = 0;
      let deleted = 0;
      const allPaths = new Set([
        ...Object.keys(localManifest),
        ...Object.keys(remoteManifest),
      ]);
      const total = allPaths.size;
      let processed = 0;

      if (total === 0) {
        this.updateProgress("Pulling", 0, 0, "nothing to sync", runOptions.silent);
      }

      this.suppressAutoPush = true;
      try {
        for (const path of allPaths) {
          const remoteEntry = remoteManifest[path] || null;
          const localEntry = localManifest[path] || null;

          if (remoteEntry && (!localEntry || !sameRevision(localEntry, remoteEntry))) {
            await this.downloadIntoCanonicalPath(path, remoteEntry);
            downloaded += 1;
          } else if (!remoteEntry && localEntry) {
            await this.deleteLocalPath(path);
            deleted += 1;
          }

          processed += 1;
          this.updateProgress("Pulling", processed, total, path, runOptions.silent);
        }
      } finally {
        this.suppressAutoPush = false;
      }

      const refreshedLocalManifest = await this.buildLocalManifest(localManifest);
      this.settings.lastLocalManifest = refreshedLocalManifest;
      this.settings.lastRemoteManifest = remoteManifest;
      this.recordSyncMetadata(
        runOptions.reason === "manual" ? "pull all" : `pull all (${runOptions.reason})`
      );
      await this.saveSettings();

      if (!runOptions.silent) {
        new Notice(`Pull finished. Downloaded ${downloaded}, deleted ${deleted}.`, 8000);
      }
    });
  }

  async buildLocalManifest(previousManifest) {
    const manifest = {};
    const files = this.app.vault.getFiles();

    for (const file of files) {
      if (!this.shouldSyncPath(file.path)) {
        continue;
      }

      const previousEntry = previousManifest ? previousManifest[file.path] : null;
      manifest[file.path] = await this.buildLocalEntry(file, previousEntry);
    }

    return manifest;
  }

  async buildLocalEntry(file, previousEntry) {
    const kind = this.detectFileKind(file.path);
    const size = Number(file.stat.size || 0);
    const mtime = Number(file.stat.mtime || 0);

    if (
      previousEntry &&
      previousEntry.kind === kind &&
      Number(previousEntry.size || 0) === size &&
      Number(previousEntry.mtime || 0) === mtime &&
      previousEntry.sha256
    ) {
      return {
        path: file.path,
        kind,
        size,
        mtime,
        sha256: previousEntry.sha256,
      };
    }

    const contents =
      kind === "text"
        ? await this.app.vault.read(file)
        : await this.app.vault.readBinary(file);
    const sha256 = await sha256Of(contents);

    return {
      path: file.path,
      kind,
      size,
      mtime,
      sha256,
    };
  }

  shouldSyncPath(path) {
    const normalized = normalizePath(path);
    const configDir = normalizePath(this.app.vault.configDir || ".obsidian");
    const pluginPrefix = normalizePath(`${configDir}/plugins/${this.manifest.id}`);
    const basename = getBasename(normalized);

    if (basename.includes(".conflict-")) {
      return false;
    }

    if (normalized.startsWith(`${pluginPrefix}/`) || normalized === pluginPrefix) {
      return false;
    }

    const excludedPrefixes = parseMultilineList(this.settings.excludedPathPrefixes).map((item) =>
      stripTrailingSlash(item)
    );

    for (const prefix of excludedPrefixes) {
      if (!prefix) {
        continue;
      }

      const normalizedPrefix = normalizePath(prefix);
      if (normalized === normalizedPrefix || normalized.startsWith(`${normalizedPrefix}/`)) {
        return false;
      }
    }

    if (normalized === configDir || normalized.startsWith(`${configDir}/`)) {
      if (!this.settings.syncObsidianFiles) {
        return false;
      }

      const relativeConfigPath = normalized.slice(configDir.length + 1);
      if (!relativeConfigPath) {
        return false;
      }

      if (relativeConfigPath.startsWith(`plugins/${this.manifest.id}/`)) {
        return false;
      }

      const allowlist = parseMultilineList(this.settings.obsidianAllowlist);
      if (allowlist.includes("*")) {
        return true;
      }

      return allowlist.some((allowed) => {
        const normalizedAllowed = stripTrailingSlash(normalizePath(allowed));
        return (
          relativeConfigPath === normalizedAllowed ||
          relativeConfigPath.startsWith(`${normalizedAllowed}/`)
        );
      });
    }

    const extension = getExtension(normalized);
    const allowedExtensions = new Set(
      parseCommaSeparatedList(this.settings.includeExtensions).map((item) =>
        item.toLowerCase()
      )
    );
    return allowedExtensions.has(extension);
  }

  detectFileKind(path) {
    return TEXT_EXTENSIONS.has(getExtension(path)) ? "text" : "binary";
  }

  getRemoteRootFolderName() {
    return sanitizeDriveFolderName(
      this.settings.remoteVaultName.trim() || this.defaultRemoteVaultName()
    );
  }

  getRemoteManifestPath() {
    return REMOTE_MANIFEST_NAME;
  }

  getRemoteCanonicalPath(localPath) {
    return normalizePath(localPath);
  }

  getRemoteConflictPath(localPath) {
    return normalizePath(`${REMOTE_CONFLICTS_DIR}/${makeConflictPath(localPath, "local")}`);
  }

  async loadRemoteManifestOrScan() {
    const manifest = await this.loadRemoteManifest();

    try {
      const scanned = await this.scanRemoteVault();
      return mergeRemoteScanWithManifest(scanned, manifest);
    } catch (error) {
      if (manifest) {
        console.warn("Falling back to stored remote manifest after scan failure.", error);
        return manifest;
      }

      throw error;
    }
  }

  async loadRemoteManifest() {
    const item = await this.findRemoteFileByPath(this.getRemoteManifestPath());
    if (!item) {
      return null;
    }

    const text = await this.downloadDriveText(item.id);
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      console.error("Failed to parse remote manifest", error);
      return null;
    }

    if (!parsed || parsed.version !== REMOTE_MANIFEST_VERSION || !parsed.files) {
      return null;
    }

    return parsed.files;
  }

  async saveRemoteManifest(files) {
    const payload = {
      version: REMOTE_MANIFEST_VERSION,
      generatedAt: new Date().toISOString(),
      remoteVaultName: this.settings.remoteVaultName,
      files,
    };
    const text = JSON.stringify(payload, null, 2);
    const driveItem = await this.upsertDriveFileByPath(
      this.getRemoteManifestPath(),
      text,
      "application/json; charset=utf-8"
    );
    return driveItem;
  }

  async scanRemoteVault() {
    const items = await this.listAllRemoteFiles();
    const files = {};

    for (const item of items) {
      if (
        item.remotePath === this.getRemoteManifestPath() ||
        item.remotePath.startsWith(`${REMOTE_CONFLICTS_DIR}/`)
      ) {
        continue;
      }

      const existing = files[item.remotePath];
      if (
        existing &&
        normalizeComparableMtime(existing.mtime) >=
          normalizeComparableMtime(item.modifiedTime)
      ) {
        continue;
      }

      files[item.remotePath] = {
        path: item.remotePath,
        kind: this.detectFileKind(item.remotePath),
        size: Number(item.size || 0),
        mtime: item.modifiedTime || null,
        sha256: null,
        itemId: item.id,
      };
    }

    return files;
  }

  async uploadLocalEntry(localEntry, remoteEntry) {
    const body =
      localEntry.kind === "text"
        ? await this.readLocalText(localEntry.path)
        : await this.readLocalBytes(localEntry.path);
    const contentType =
      localEntry.kind === "text" ? "text/plain; charset=utf-8" : "application/octet-stream";

    const driveItem = await this.upsertDriveFileByPath(
      this.getRemoteCanonicalPath(localEntry.path),
      body,
      contentType,
      remoteEntry ? remoteEntry.itemId : null
    );

    return {
      path: localEntry.path,
      kind: localEntry.kind,
      size: Number(driveItem.size || localEntry.size),
      mtime: driveItem.modifiedTime || new Date().toISOString(),
      sha256: localEntry.sha256,
      itemId: driveItem.id,
    };
  }

  async uploadRemoteConflictCopy(localEntry) {
    const body =
      localEntry.kind === "text"
        ? await this.readLocalText(localEntry.path)
        : await this.readLocalBytes(localEntry.path);
    const contentType =
      localEntry.kind === "text" ? "text/plain; charset=utf-8" : "application/octet-stream";

    await this.createDriveFileAtPath(
      this.getRemoteConflictPath(localEntry.path),
      body,
      contentType
    );
  }

  async downloadRemoteConflictCopy(path, remoteEntry) {
    const payload = await this.downloadRemotePayload(remoteEntry);
    const conflictPath = makeConflictPath(path, "remote");
    await this.writeLocalEntry(
      conflictPath,
      remoteEntry.kind || this.detectFileKind(path),
      payload.data,
      payload.mtime
    );
  }

  async downloadIntoCanonicalPath(path, remoteEntry) {
    const payload = await this.downloadRemotePayload(remoteEntry);
    await this.writeLocalEntry(
      path,
      remoteEntry.kind || this.detectFileKind(path),
      payload.data,
      payload.mtime
    );
  }

  async downloadRemotePayload(remoteEntry) {
    const fileId =
      remoteEntry.itemId ||
      (await this.findRemoteIdByPath(this.getRemoteCanonicalPath(remoteEntry.path)));
    if (!fileId) {
      throw new Error(`Remote file not found: ${remoteEntry.path}`);
    }

    const metadata = await this.getDriveFileMetadata(fileId);
    const response = await this.googleRequest({
      path: `/files/${fileId}?alt=media`,
      method: "GET",
    });

    if ((remoteEntry.kind || this.detectFileKind(remoteEntry.path)) === "text") {
      return {
        data: response.text,
        mtime: metadata.modifiedTime || remoteEntry.mtime || null,
      };
    }

    return {
      data: response.arrayBuffer,
      mtime: metadata.modifiedTime || remoteEntry.mtime || null,
    };
  }

  async downloadDriveText(fileId) {
    const response = await this.googleRequest({
      path: `/files/${fileId}?alt=media`,
      method: "GET",
    });
    return response.text;
  }

  async writeLocalEntry(path, kind, data, mtimeIso) {
    const normalized = normalizePath(path);
    await this.ensureLocalFolder(getDirname(normalized));

    const existing = this.app.vault.getFileByPath(normalized);
    const writeOptions = {};
    if (mtimeIso) {
      const parsedMtime = Date.parse(mtimeIso);
      if (!Number.isNaN(parsedMtime)) {
        writeOptions.mtime = parsedMtime;
      }
    }

    if (kind === "text") {
      if (existing) {
        await this.app.vault.modify(existing, data, writeOptions);
      } else {
        await this.app.vault.create(normalized, data, writeOptions);
      }
      return;
    }

    if (existing) {
      await this.app.vault.modifyBinary(existing, data, writeOptions);
    } else {
      await this.app.vault.createBinary(normalized, data, writeOptions);
    }
  }

  async deleteLocalPath(path) {
    const normalized = normalizePath(path);
    const existing = this.app.vault.getAbstractFileByPath(normalized);
    if (!existing) {
      return;
    }

    await this.app.vault.delete(existing, true);
  }

  async ensureLocalFolder(folderPath) {
    if (!folderPath) {
      return;
    }

    const segments = normalizePath(folderPath).split("/");
    let current = "";

    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      if (!this.app.vault.getFolderByPath(current)) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  async readLocalText(path) {
    const file = this.app.vault.getFileByPath(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }
    return await this.app.vault.read(file);
  }

  async readLocalBytes(path) {
    const file = this.app.vault.getFileByPath(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }
    return await this.app.vault.readBinary(file);
  }

  async listAllRemoteFiles() {
    const rootId = await this.ensureRemoteRootFolderId();
    return await this.listRemoteFilesRecursively(rootId, "");
  }

  async listRemoteFilesRecursively(parentId, currentPath) {
    const files = [];
    const children = await this.listDriveChildren(parentId);

    for (const child of children) {
      const childPath = currentPath
        ? normalizePath(`${currentPath}/${child.name}`)
        : child.name;
      if (child.mimeType === DRIVE_FOLDER_MIME_TYPE) {
        files.push(...(await this.listRemoteFilesRecursively(child.id, childPath)));
        continue;
      }

      files.push(
        Object.assign({}, child, {
          remotePath: childPath,
        })
      );
    }

    return files;
  }

  async listDriveChildren(parentId) {
    const files = [];
    let pageToken = null;

    do {
      const params = new URLSearchParams({
        pageSize: "1000",
        fields: "nextPageToken,files(id,name,mimeType,modifiedTime,size,parents)",
        q: [
          `'${escapeDriveQueryLiteral(parentId)}' in parents`,
          "trashed = false",
        ].join(" and "),
        orderBy: "name",
      });

      if (pageToken) {
        params.set("pageToken", pageToken);
      }

      const response = await this.googleRequest({
        path: `/files?${params.toString()}`,
        method: "GET",
      });

      const json = response.json || {};
      files.push(...(Array.isArray(json.files) ? json.files : []));
      pageToken = json.nextPageToken || null;
    } while (pageToken);

    return files;
  }

  async ensureRemoteRootFolderId() {
    const folderName = this.getRemoteRootFolderName();
    if (
      this.remoteRootFolderCache &&
      this.remoteRootFolderCache.name === folderName &&
      this.remoteRootFolderCache.id
    ) {
      return this.remoteRootFolderCache.id;
    }

    const existing = await this.findChildByName("root", folderName, DRIVE_FOLDER_MIME_TYPE);
    if (existing) {
      await this.rememberRemoteRootFolder(existing.id, folderName);
      return existing.id;
    }

    const created = await this.createDriveFolder(folderName, "root");
    await this.rememberRemoteRootFolder(created.id, folderName);
    return created.id;
  }

  async ensureRemoteFolderPath(relativeDirPath) {
    const rootId = await this.ensureRemoteRootFolderId();
    if (!relativeDirPath) {
      return rootId;
    }

    const segments = normalizePath(relativeDirPath)
      .split("/")
      .filter((segment) => Boolean(segment));
    let currentParentId = rootId;

    for (const segment of segments) {
      let child = await this.findChildByName(currentParentId, segment, DRIVE_FOLDER_MIME_TYPE);
      if (!child) {
        child = await this.createDriveFolder(segment, currentParentId);
      }
      currentParentId = child.id;
    }

    return currentParentId;
  }

  async findRemoteFileByPath(remotePath) {
    const normalized = stripLeadingSlash(normalizePath(remotePath || ""));
    if (!normalized) {
      return null;
    }

    const segments = normalized.split("/").filter((segment) => Boolean(segment));
    let parentId = await this.ensureRemoteRootFolderId();

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const isLeaf = index === segments.length - 1;
      const item = await this.findChildByName(
        parentId,
        segment,
        isLeaf ? null : DRIVE_FOLDER_MIME_TYPE
      );
      if (!item) {
        return null;
      }
      parentId = item.id;
      if (isLeaf) {
        return item;
      }
    }

    return null;
  }

  async findChildByName(parentId, name, mimeType) {
    const query = [
      `name = '${escapeDriveQueryLiteral(name)}'`,
      `'${escapeDriveQueryLiteral(parentId)}' in parents`,
      "trashed = false",
    ].join(" and ");

    const normalizedQuery = mimeType
      ? `${query} and mimeType = '${escapeDriveQueryLiteral(mimeType)}'`
      : query;

    const params = new URLSearchParams({
      pageSize: "10",
      orderBy: "modifiedTime desc",
      fields: "files(id,name,mimeType,modifiedTime,size,parents)",
      q: normalizedQuery,
    });

    const response = await this.googleRequest({
      path: `/files?${params.toString()}`,
      method: "GET",
    });

    const files = Array.isArray(response.json?.files) ? response.json.files : [];
    return files[0] || null;
  }

  async findRemoteIdByPath(path) {
    const item = await this.findRemoteFileByPath(path);
    return item ? item.id : null;
  }

  async getDriveFileMetadata(fileId) {
    const params = new URLSearchParams({
      fields: "id,name,mimeType,modifiedTime,size",
    });

    const response = await this.googleRequest({
      path: `/files/${fileId}?${params.toString()}`,
      method: "GET",
    });

    return response.json || {};
  }

  async deleteRemotePath(remotePath, remoteEntry) {
    const fileId =
      remoteEntry?.itemId || (await this.findRemoteIdByPath(this.getRemoteCanonicalPath(remotePath)));
    if (!fileId) {
      return;
    }

    await this.googleRequest({
      path: `/files/${fileId}`,
      method: "DELETE",
    });
  }

  async upsertDriveFileByPath(remotePath, data, contentType, knownId) {
    let fileId = knownId || null;

    if (!fileId) {
      const existing = await this.findRemoteFileByPath(remotePath);
      fileId = existing ? existing.id : null;
    }

    if (fileId) {
      return await this.updateDriveFile(fileId, data, contentType);
    }

    return await this.createDriveFileAtPath(remotePath, data, contentType);
  }

  async createDriveFolder(name, parentId) {
    const response = await this.googleRequest({
      path: "/files?fields=id,name,mimeType,modifiedTime,size",
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({
        name,
        parents: [parentId],
        mimeType: DRIVE_FOLDER_MIME_TYPE,
      }),
    });

    return response.json || {};
  }

  async createDriveFileAtPath(remotePath, data, contentType) {
    const normalized = stripLeadingSlash(normalizePath(remotePath));
    const parentPath = getDirname(normalized);
    const fileName = getBasename(normalized);
    const parentId = await this.ensureRemoteFolderPath(parentPath);

    const metadataResponse = await this.googleRequest({
      path: "/files?fields=id,name,mimeType,modifiedTime,size",
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({
        name: fileName,
        parents: [parentId],
        mimeType: contentType.split(";")[0],
      }),
    });

    const created = metadataResponse.json || {};
    return await this.updateDriveFile(created.id, data, contentType);
  }

  async updateDriveFile(fileId, data, contentType) {
    const response = await this.googleRequest({
      url: `${GOOGLE_DRIVE_UPLOAD_API}/files/${fileId}?uploadType=media&fields=id,name,mimeType,modifiedTime,size`,
      method: "PATCH",
      contentType,
      body: data,
    });
    return response.json || {};
  }

  async googleRequest(options, retried) {
    const headers = Object.assign({}, options.headers || {});
    const url = options.url || `${GOOGLE_DRIVE_API}${options.path}`;
    headers.Authorization = `Bearer ${await this.getValidAccessToken(false)}`;

    const response = await requestUrl({
      url,
      method: options.method || "GET",
      headers,
      contentType: options.contentType,
      body: options.body,
      throw: false,
    });

    if (response.status === 401 && !retried) {
      await this.getValidAccessToken(true);
      return await this.googleRequest(options, true);
    }

    if (response.status >= 400) {
      throw new Error(extractHttpError(response));
    }

    return response;
  }

  recomputeSyncedState(previousLocalState, previousRemoteState, localManifest, remoteManifest) {
    const nextLocal = Object.assign({}, previousLocalState || {});
    const nextRemote = Object.assign({}, previousRemoteState || {});
    const allPaths = new Set([
      ...Object.keys(previousLocalState || {}),
      ...Object.keys(previousRemoteState || {}),
      ...Object.keys(localManifest || {}),
      ...Object.keys(remoteManifest || {}),
    ]);

    for (const path of allPaths) {
      const localEntry = localManifest[path] || null;
      const remoteEntry = remoteManifest[path] || null;

      if (!localEntry && !remoteEntry) {
        delete nextLocal[path];
        delete nextRemote[path];
        continue;
      }

      if (localEntry && remoteEntry && sameRevision(localEntry, remoteEntry)) {
        nextLocal[path] = {
          path,
          kind: localEntry.kind,
          size: localEntry.size,
          mtime: localEntry.mtime,
          sha256: localEntry.sha256,
        };
        nextRemote[path] = {
          path,
          kind: remoteEntry.kind,
          size: remoteEntry.size,
          mtime: remoteEntry.mtime,
          sha256: remoteEntry.sha256,
          itemId: remoteEntry.itemId || null,
        };
      }
    }

    return { local: nextLocal, remote: nextRemote };
  }

  formatError(error) {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return String(error || "Unknown error");
  }
};

class GoogleDriveMirrorSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Google Drive Mirror" });
    containerEl.createEl("p", {
      text: "Desktop signs in with Google once, then every device can manually Push/Pull against the same visible folder in My Drive. iPhone/iPad should import a setup bundle exported from desktop.",
    });

    new Setting(containerEl)
      .setName("Client ID")
      .setDesc("Google OAuth client ID for a Desktop app.")
      .addText((text) =>
        text
          .setPlaceholder("1234567890-abcdef.apps.googleusercontent.com")
          .setValue(this.plugin.settings.clientId)
          .onChange(async (value) => {
            this.plugin.settings.clientId = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Client Secret")
      .setDesc("Google OAuth Desktop App client secret. Some Google clients still require it during token exchange.")
      .addText((text) =>
        text
          .setPlaceholder("GOCSPX-...")
          .setValue(this.plugin.settings.clientSecret)
          .onChange(async (value) => {
            this.plugin.settings.clientSecret = value.trim();
            await this.plugin.saveSettings();
          })
      );

    const storedTokens = this.plugin.loadStoredTokens();
    const authState = storedTokens && storedTokens.accessToken ? "Signed in" : "Not signed in";
    const authDesc =
      storedTokens && storedTokens.expiresAt
        ? `Current token expires around ${new Date(storedTokens.expiresAt).toLocaleString()}.`
        : "No Google OAuth token is currently stored.";

    new Setting(containerEl)
      .setName("Auth status")
      .setDesc(authDesc)
      .addExtraButton((button) => {
        button.setIcon(storedTokens && storedTokens.accessToken ? "check-circle" : "alert-circle");
        button.setTooltip(authState);
      });

    const lastSyncSummary = formatLastSyncSummary(
      this.plugin.settings.lastSyncAt,
      this.plugin.settings.lastSyncDevice,
      this.plugin.settings.lastSyncAction
    );
    new Setting(containerEl)
      .setName("Last sync")
      .setDesc(lastSyncSummary)
      .addExtraButton((button) => {
        button.setIcon(this.plugin.settings.lastSyncAt ? "history" : "minus");
        button.setTooltip("Last sync metadata");
      });

    if (this.plugin.settings.lastAuthError) {
      new Setting(containerEl)
        .setName("Last auth error")
        .setDesc(this.plugin.settings.lastAuthError)
        .addExtraButton((button) => {
          button.setIcon("alert-triangle");
          button.setTooltip("Last Google OAuth error");
        });
    }

    const redirectDescription = containerEl.createDiv();
    redirectDescription.createEl("div", {
      text: "The plugin starts a temporary loopback listener automatically during sign-in:",
    });
    redirectDescription.createEl("code", {
      text: "http://127.0.0.1:{random-port}/oauth2callback",
    });

    new Setting(containerEl)
      .setName("OAuth redirect")
      .setDesc(redirectDescription)
      .addExtraButton((button) => {
        button.setIcon("info").setTooltip(
          "Google Desktop App OAuth uses a temporary localhost callback."
        );
      });

    new Setting(containerEl)
      .setName("Remote vault name")
      .setDesc("Visible folder name in My Drive. The plugin mirrors your vault under this folder.")
      .addText((text) =>
        text
          .setPlaceholder(this.plugin.defaultRemoteVaultName())
          .setValue(this.plugin.settings.remoteVaultName)
          .onChange(async (value) => {
            this.plugin.settings.remoteVaultName =
              sanitizeDriveFolderName(value.trim() || this.plugin.defaultRemoteVaultName());
            this.plugin.remoteRootFolderCache = null;
            this.plugin.settings.lastRemoteFolderId = "";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("This device name")
      .setDesc("Stored in sync metadata so you can see which device last pushed or pulled.")
      .addText((text) =>
        text
          .setPlaceholder(this.plugin.defaultDeviceLabel())
          .setValue(this.plugin.settings.deviceLabel)
          .onChange(async (value) => {
            this.plugin.settings.deviceLabel =
              value.trim() || this.plugin.defaultDeviceLabel();
            await this.plugin.saveSettings();
          })
      );

    const remoteFolderUrl = this.plugin.getRemoteFolderUrl();
    new Setting(containerEl)
      .setName("Remote folder")
      .setDesc(
        remoteFolderUrl
          ? `Open the visible Google Drive folder: ${remoteFolderUrl}`
          : "The visible Google Drive folder will appear here after the first successful push."
      )
      .addButton((button) => {
        button
          .setButtonText("Open folder")
          .setDisabled(!remoteFolderUrl)
          .onClick(() => {
            this.plugin.openRemoteFolderUrl();
          });
      });

    new Setting(containerEl)
      .setName("Device setup bundle")
      .setDesc(
        "Sign in once on desktop, then copy this bundle and import it on iPhone/iPad to reuse the same Google Drive connection."
      )
      .addButton((button) => {
        button.setButtonText("Copy bundle").onClick(async () => {
          try {
            await this.plugin.copySetupBundle();
          } catch (error) {
            new Notice(this.plugin.formatError(error), 8000);
          }
        });
      })
      .addButton((button) => {
        button.setButtonText("Import bundle").onClick(async () => {
          try {
            await this.plugin.openImportSetupBundleModal();
          } catch (error) {
            new Notice(this.plugin.formatError(error), 8000);
          }
        });
      })
      .addButton((button) => {
        button
          .setButtonText("Show QR")
          .setDisabled(!Platform.isDesktopApp)
          .onClick(async () => {
            try {
              await this.plugin.showSetupBundleQr();
            } catch (error) {
              new Notice(this.plugin.formatError(error), 8000);
            }
          });
      });

    new Setting(containerEl)
      .setName("Manual sync policy")
      .setDesc(
        "Push all mirrors this device to Drive. Pull all mirrors Drive to this device. Manual sync overwrites target-side edits and deletions."
      );

    new Setting(containerEl)
      .setName("Pull on startup")
      .setDesc("When enabled, this device automatically pulls from Drive once after the vault layout is ready.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoPullOnStartup).onChange(async (value) => {
          this.plugin.settings.autoPullOnStartup = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Push after save")
      .setDesc("When enabled, file changes queue an automatic push after a short debounce. This still follows overwrite semantics.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoPushAfterSave).onChange(async (value) => {
          this.plugin.settings.autoPushAfterSave = value;
          if (!value) {
            this.plugin.autoPushDebounced?.cancel?.();
            this.plugin.progressMessage = "";
            this.plugin.setStatus("idle");
          }
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Allowed file extensions")
      .setDesc(
        "Comma-separated. Files outside this list are ignored unless matched by the .obsidian allow-list."
      )
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.includeExtensions)
          .onChange(async (value) => {
            this.plugin.settings.includeExtensions = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Excluded path prefixes")
      .setDesc("One per line, relative to the vault root.")
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.excludedPathPrefixes)
          .onChange(async (value) => {
            this.plugin.settings.excludedPathPrefixes = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Sync selected .obsidian files")
      .setDesc("Disabled by default to avoid syncing per-device workspace state.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.syncObsidianFiles).onChange(async (value) => {
          this.plugin.settings.syncObsidianFiles = value;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    if (this.plugin.settings.syncObsidianFiles) {
      new Setting(containerEl)
        .setName(".obsidian allow-list")
        .setDesc("One per line, relative to .obsidian. Use * to allow everything inside .obsidian.")
        .addTextArea((text) =>
          text
            .setValue(this.plugin.settings.obsidianAllowlist)
            .onChange(async (value) => {
              this.plugin.settings.obsidianAllowlist = value;
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName("Sign in")
      .setDesc(
        Platform.isDesktopApp
          ? "On desktop, opens Google OAuth in your default browser."
          : "On iPhone/iPad, use Import bundle instead of browser sign-in."
      )
      .addButton((button) =>
        button
          .setButtonText("Start sign-in")
          .setDisabled(!Platform.isDesktopApp)
          .onClick(async () => {
            await this.plugin.beginSignIn();
          })
      )
      .addButton((button) =>
        button.setButtonText("Clear auth").setWarning().onClick(async () => {
          await this.plugin.clearStoredTokens();
          new Notice("Google Drive sign-in cleared.");
        })
      );

    new Setting(containerEl)
      .setName("Manual actions")
      .setDesc("Use these actions directly even if automatic startup pull or save-triggered push is enabled.")
      .addButton((button) =>
        button.setButtonText("Push current").onClick(async () => {
          await this.plugin.pushActiveFile();
        })
      )
      .addButton((button) =>
        button.setButtonText("Push all").onClick(async () => {
          await this.plugin.pushAllChanges();
        })
      )
      .addButton((button) =>
        button.setButtonText("Pull all").onClick(async () => {
          await this.plugin.pullRemoteChanges();
        })
      );
  }
}

class SetupBundleExportModal extends Modal {
  constructor(app, payload) {
    super(app);
    this.payload = payload;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Google Drive setup bundle" });
    contentEl.createEl("p", {
      text: "Copy this bundle into another device running the same plugin. Treat it like a password because it contains a refresh token.",
    });
    const textArea = contentEl.createEl("textarea");
    textArea.style.width = "100%";
    textArea.style.minHeight = "260px";
    textArea.value = this.payload;
    textArea.select();
  }

  onClose() {
    this.contentEl.empty();
  }
}

class SetupBundleImportModal extends Modal {
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Import Google Drive setup bundle" });
    contentEl.createEl("p", {
      text: "Paste the bundle exported from your desktop device. This imports Google Drive credentials and sync settings.",
    });

    const textArea = contentEl.createEl("textarea");
    textArea.style.width = "100%";
    textArea.style.minHeight = "260px";
    textArea.placeholder = "{ ... }";

    const actions = contentEl.createDiv();
    actions.style.marginTop = "1rem";
    actions.style.display = "flex";
    actions.style.gap = "0.75rem";

    const importButton = actions.createEl("button", { text: "Import" });
    importButton.addEventListener("click", async () => {
      try {
        await this.onSubmit(textArea.value);
        this.close();
      } catch (error) {
        new Notice(error instanceof Error ? error.message : String(error), 8000);
      }
    });

    const cancelButton = actions.createEl("button", { text: "Cancel" });
    cancelButton.addEventListener("click", () => {
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class SetupBundleQrModal extends Modal {
  constructor(app, dataUrl, importUrl) {
    super(app);
    this.dataUrl = dataUrl;
    this.importUrl = importUrl;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Scan to import on iPhone / iPad" });
    contentEl.createEl("p", {
      text: "Open the camera on the other device, scan this QR code, then tap the obsidian:// link to import the setup bundle automatically.",
    });
    const image = contentEl.createEl("img", {
      attr: {
        src: this.dataUrl,
        alt: "Google Drive setup bundle QR",
      },
    });
    image.style.width = "320px";
    image.style.maxWidth = "100%";
    image.style.display = "block";
    image.style.margin = "0 auto 1rem";

    const code = contentEl.createEl("code", { text: this.importUrl });
    code.style.display = "block";
    code.style.wordBreak = "break-all";
  }

  onClose() {
    this.contentEl.empty();
  }
}

function buildStoredTokenPayload(tokenResponse) {
  const expiresIn = Number(tokenResponse.expires_in || 3600);
  return {
    accessToken: tokenResponse.access_token || "",
    refreshToken: tokenResponse.refresh_token || "",
    expiresAt: Date.now() + expiresIn * 1000,
    scope: tokenResponse.scope || "",
    tokenType: tokenResponse.token_type || "Bearer",
  };
}

function normalizeImportedTokenSet(tokenResponse) {
  if (tokenResponse && tokenResponse.accessToken) {
    return {
      accessToken: String(tokenResponse.accessToken || ""),
      refreshToken: String(
        tokenResponse.refreshToken || tokenResponse.refresh_token || ""
      ),
      expiresAt: Number(tokenResponse.expiresAt || Date.now() + 3600 * 1000),
      scope: String(tokenResponse.scope || ""),
      tokenType: String(tokenResponse.tokenType || tokenResponse.token_type || "Bearer"),
    };
  }

  const normalized = buildStoredTokenPayload(tokenResponse || {});
  normalized.refreshToken = String(
    tokenResponse?.refreshToken || tokenResponse?.refresh_token || normalized.refreshToken || ""
  );
  return normalized;
}

function sameRevision(left, right) {
  if (!left || !right) {
    return false;
  }

  if (left.sha256 && right.sha256) {
    return left.sha256 === right.sha256;
  }

  return (
    String(left.kind || "") === String(right.kind || "") &&
    Number(left.size || 0) === Number(right.size || 0) &&
    normalizeComparableMtime(left.mtime) === normalizeComparableMtime(right.mtime)
  );
}

function mergeRemoteScanWithManifest(scannedFiles, manifestFiles) {
  const merged = Object.assign({}, scannedFiles || {});
  const manifest = manifestFiles || {};

  for (const [path, scannedEntry] of Object.entries(merged)) {
    const manifestEntry = manifest[path];
    if (!manifestEntry) {
      continue;
    }

    if (!sameRevision(scannedEntry, manifestEntry)) {
      continue;
    }

    merged[path] = Object.assign({}, scannedEntry, {
      sha256: manifestEntry.sha256 || scannedEntry.sha256 || null,
      itemId: scannedEntry.itemId || manifestEntry.itemId || null,
    });
  }

  return merged;
}

function formatLastSyncSummary(lastSyncAt, lastSyncDevice, lastSyncAction) {
  if (!lastSyncAt) {
    return "No sync has been recorded yet.";
  }

  const at = new Date(lastSyncAt).toLocaleString();
  const device = lastSyncDevice || "unknown device";
  const action = lastSyncAction || "sync";
  return `${action} from ${device} at ${at}.`;
}

function normalizeComparableMtime(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "number") {
    return String(Math.trunc(value));
  }

  const parsed = Date.parse(String(value));
  if (!Number.isNaN(parsed)) {
    return String(parsed);
  }

  return String(value);
}

async function sha256Of(value) {
  let buffer = null;

  if (typeof value === "string") {
    buffer = new TextEncoder().encode(value).buffer;
  } else if (value instanceof ArrayBuffer) {
    buffer = value;
  } else if (ArrayBuffer.isView(value)) {
    buffer = value.buffer;
  } else {
    throw new Error("Unsupported value for hashing.");
  }

  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return arrayBufferToHex ? arrayBufferToHex(digest) : bufferToHex(digest);
}

function createPkceVerifier() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(64)));
}

async function createPkceChallenge(verifier) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return base64UrlEncode(new Uint8Array(digest));
}

function createRandomToken(bytes) {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(bytes)));
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeUtf8(value) {
  return base64UrlEncode(new TextEncoder().encode(String(value || "")));
}

function base64UrlDecodeUtf8(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new TextDecoder("utf-8").decode(bytes);
}

function parseCommaSeparatedList(value) {
  return String(value || "")
    .split(/[\r\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMultilineList(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/g, "");
}

function stripLeadingSlash(value) {
  return String(value || "").replace(/^\/+/g, "");
}

function sanitizeDriveFolderName(value) {
  return String(value || "").trim().replace(/[\\/]+/g, "-") || "default-vault";
}

function inferDefaultDeviceLabel() {
  if (typeof navigator !== "undefined") {
    const agent = String(navigator.userAgent || "");
    if (/iPhone/i.test(agent)) {
      return "iPhone";
    }
    if (/iPad/i.test(agent)) {
      return "iPad";
    }
    if (/Windows/i.test(agent)) {
      return "Windows";
    }
    if (/Macintosh|Mac OS X/i.test(agent)) {
      return "Mac";
    }
    if (/Android/i.test(agent)) {
      return "Android";
    }
    if (/Linux/i.test(agent)) {
      return "Linux";
    }
  }

  if (Platform.isDesktopApp) {
    return "Desktop";
  }

  return "Mobile";
}

function getExtension(path) {
  const basename = getBasename(path);
  const index = basename.lastIndexOf(".");
  if (index < 0) {
    return "";
  }
  return basename.slice(index + 1).toLowerCase();
}

function getDirname(path) {
  const normalized = normalizePath(path || "");
  const index = normalized.lastIndexOf("/");
  if (index < 0) {
    return "";
  }
  return normalized.slice(0, index);
}

function getBasename(path) {
  const normalized = normalizePath(path || "");
  const index = normalized.lastIndexOf("/");
  if (index < 0) {
    return normalized;
  }
  return normalized.slice(index + 1);
}

function makeConflictPath(originalPath, sourceLabel) {
  const normalized = normalizePath(originalPath);
  const dirname = getDirname(normalized);
  const basename = getBasename(normalized);
  const dotIndex = basename.lastIndexOf(".");
  const timestamp = timestampForConflicts();
  const stem = dotIndex >= 0 ? basename.slice(0, dotIndex) : basename;
  const extension = dotIndex >= 0 ? basename.slice(dotIndex) : "";
  const conflictName = `${stem}.conflict-${sourceLabel}-${timestamp}${extension}`;
  return dirname ? `${dirname}/${conflictName}` : conflictName;
}

function timestampForConflicts() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

function extractHttpError(response) {
  const json = response.json || {};

  if (json.error) {
    if (typeof json.error === "string") {
      return json.error_description || json.error;
    }
    if (json.error.message) {
      return json.error.message;
    }
  }

  if (json.error_description) {
    return json.error_description;
  }

  if (response.text) {
    return `${response.status}: ${response.text}`;
  }

  return `HTTP ${response.status}`;
}

function parseJsonResponse(response) {
  if (response && response.json && typeof response.json === "object") {
    return response.json;
  }

  if (response && response.text) {
    try {
      return JSON.parse(response.text);
    } catch (_error) {
      throw new Error(`Expected JSON response but received: ${response.text}`);
    }
  }

  throw new Error("Expected JSON response but received an empty body.");
}

function escapeDriveQueryLiteral(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function buildLoopbackCallbackHtml(success) {
  const title = success ? "Google authorization received" : "Google Drive sign-in failed";
  const body = success
    ? "Obsidian is finishing sign-in now. Wait for the confirmation notice in Obsidian, then close this tab."
    : "The browser returned an OAuth error. Check Obsidian for details, then try again.";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
      body {
        font-family: system-ui, sans-serif;
        margin: 0;
        padding: 2rem;
        background: #f6f7fb;
        color: #1e293b;
      }
      main {
        max-width: 42rem;
        margin: 0 auto;
        background: white;
        border-radius: 16px;
        padding: 1.5rem 1.75rem;
        box-shadow: 0 10px 40px rgba(15, 23, 42, 0.08);
      }
      h1 {
        margin-top: 0;
        font-size: 1.35rem;
      }
      p {
        margin-bottom: 0;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${body}</p>
    </main>
  </body>
</html>`;
}
