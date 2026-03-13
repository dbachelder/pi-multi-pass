/**
 * Multi-Subscription extension for pi.
 *
 * Register additional OAuth subscription accounts for any supported provider.
 * Each extra account gets its own provider name, /login entry, and cloned models.
 *
 * Configuration via environment variables:
 *
 *   MULTI_SUB=anthropic:2,openai-codex:1,github-copilot:1
 *
 * This creates:
 *   - anthropic-2, anthropic-3  (2 extra Anthropic accounts)
 *   - openai-codex-2            (1 extra Codex account)
 *   - github-copilot-2          (1 extra Copilot account)
 *
 * Supported providers:
 *   - anthropic          (Claude Pro/Max)
 *   - openai-codex       (ChatGPT Plus/Pro Codex)
 *   - github-copilot     (GitHub Copilot)
 *   - google-gemini-cli  (Google Cloud Code Assist)
 *   - google-antigravity (Antigravity)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
	// Anthropic
	anthropicOAuthProvider,
	loginAnthropic,
	refreshAnthropicToken,
	// OpenAI Codex
	openaiCodexOAuthProvider,
	loginOpenAICodex,
	refreshOpenAICodexToken,
	// GitHub Copilot
	githubCopilotOAuthProvider,
	loginGitHubCopilot,
	refreshGitHubCopilotToken,
	getGitHubCopilotBaseUrl,
	normalizeDomain,
	// Google Gemini CLI
	geminiCliOAuthProvider,
	loginGeminiCli,
	refreshGoogleCloudToken,
	// Google Antigravity
	antigravityOAuthProvider,
	loginAntigravity,
	refreshAntigravityToken,
	// Types
	type OAuthCredentials,
	type OAuthLoginCallbacks,
	type OAuthProviderInterface,
} from "@mariozechner/pi-ai/oauth";
import { getModels, type Api, type Model } from "@mariozechner/pi-ai";

// --------------------------------------------------------------------------
// Provider definitions: how to clone each OAuth provider
// --------------------------------------------------------------------------

type CopilotCredentials = OAuthCredentials & { enterpriseUrl?: string };
type GeminiCredentials = OAuthCredentials & { projectId?: string };

interface ProviderTemplate {
	/** Human-readable base name */
	displayName: string;
	/** The built-in provider's OAuth interface (for reference) */
	builtinOAuth: OAuthProviderInterface;
	/** Whether the login uses a local callback server */
	usesCallbackServer?: boolean;
	/** Build the OAuth config for the cloned provider */
	buildOAuth(index: number): Omit<OAuthProviderInterface, "id">;
	/** Optional: modifyModels function for providers that need it */
	buildModifyModels?(providerName: string): OAuthProviderInterface["modifyModels"];
}

const PROVIDER_TEMPLATES: Record<string, ProviderTemplate> = {
	anthropic: {
		displayName: "Anthropic (Claude Pro/Max)",
		builtinOAuth: anthropicOAuthProvider,
		buildOAuth(index: number) {
			return {
				name: `Anthropic (Claude Pro/Max) #${index}`,
				async login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
					return loginAnthropic(
						(url) => callbacks.onAuth({ url }),
						() => callbacks.onPrompt({ message: "Paste the authorization code:" }),
					);
				},
				async refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
					return refreshAnthropicToken(credentials.refresh);
				},
				getApiKey(credentials: OAuthCredentials): string {
					return credentials.access;
				},
			};
		},
	},

	"openai-codex": {
		displayName: "ChatGPT Plus/Pro (Codex)",
		builtinOAuth: openaiCodexOAuthProvider,
		usesCallbackServer: true,
		buildOAuth(index: number) {
			return {
				name: `ChatGPT Plus/Pro (Codex) #${index}`,
				usesCallbackServer: true,
				async login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
					return loginOpenAICodex({
						onAuth: callbacks.onAuth,
						onPrompt: callbacks.onPrompt,
						onProgress: callbacks.onProgress,
						onManualCodeInput: callbacks.onManualCodeInput,
					});
				},
				async refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
					return refreshOpenAICodexToken(credentials.refresh);
				},
				getApiKey(credentials: OAuthCredentials): string {
					return credentials.access;
				},
			};
		},
	},

	"github-copilot": {
		displayName: "GitHub Copilot",
		builtinOAuth: githubCopilotOAuthProvider,
		buildOAuth(index: number) {
			return {
				name: `GitHub Copilot #${index}`,
				async login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
					return loginGitHubCopilot({
						onAuth: (url, instructions) => callbacks.onAuth({ url, instructions }),
						onPrompt: callbacks.onPrompt,
						onProgress: callbacks.onProgress,
						signal: callbacks.signal,
					});
				},
				async refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
					const creds = credentials as CopilotCredentials;
					return refreshGitHubCopilotToken(creds.refresh, creds.enterpriseUrl);
				},
				getApiKey(credentials: OAuthCredentials): string {
					return credentials.access;
				},
			};
		},
		buildModifyModels(providerName: string) {
			return (models: Model<Api>[], credentials: OAuthCredentials): Model<Api>[] => {
				const creds = credentials as CopilotCredentials;
				const domain = creds.enterpriseUrl
					? (normalizeDomain(creds.enterpriseUrl) ?? undefined)
					: undefined;
				const baseUrl = getGitHubCopilotBaseUrl(creds.access, domain);
				return models.map((m) =>
					m.provider === providerName ? { ...m, baseUrl } : m,
				);
			};
		},
	},

	"google-gemini-cli": {
		displayName: "Google Cloud Code Assist (Gemini CLI)",
		builtinOAuth: geminiCliOAuthProvider,
		usesCallbackServer: true,
		buildOAuth(index: number) {
			return {
				name: `Google Cloud Code Assist #${index}`,
				usesCallbackServer: true,
				async login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
					return loginGeminiCli(
						callbacks.onAuth,
						callbacks.onProgress,
						callbacks.onManualCodeInput,
					);
				},
				async refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
					const creds = credentials as GeminiCredentials;
					if (!creds.projectId) {
						throw new Error("Google Cloud credentials missing projectId");
					}
					return refreshGoogleCloudToken(creds.refresh, creds.projectId);
				},
				getApiKey(credentials: OAuthCredentials): string {
					const creds = credentials as GeminiCredentials;
					return JSON.stringify({ token: creds.access, projectId: creds.projectId });
				},
			};
		},
	},

	"google-antigravity": {
		displayName: "Antigravity",
		builtinOAuth: antigravityOAuthProvider,
		usesCallbackServer: true,
		buildOAuth(index: number) {
			return {
				name: `Antigravity #${index}`,
				usesCallbackServer: true,
				async login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
					return loginAntigravity(
						callbacks.onAuth,
						callbacks.onProgress,
						callbacks.onManualCodeInput,
					);
				},
				async refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
					const creds = credentials as GeminiCredentials;
					if (!creds.projectId) {
						throw new Error("Antigravity credentials missing projectId");
					}
					return refreshAntigravityToken(creds.refresh, creds.projectId);
				},
				getApiKey(credentials: OAuthCredentials): string {
					const creds = credentials as GeminiCredentials;
					return JSON.stringify({ token: creds.access, projectId: creds.projectId });
				},
			};
		},
	},
};

// --------------------------------------------------------------------------
// Config parsing
// --------------------------------------------------------------------------

interface SubConfig {
	provider: string;
	count: number;
}

function parseConfig(): SubConfig[] {
	const raw = process.env.MULTI_SUB;
	if (!raw) return [];

	return raw.split(",").map((entry) => {
		const [provider, countStr] = entry.trim().split(":");
		const count = parseInt(countStr || "1", 10);
		if (!provider || isNaN(count) || count < 1) {
			throw new Error(`Invalid MULTI_SUB entry: "${entry}". Format: provider:count`);
		}
		if (!PROVIDER_TEMPLATES[provider]) {
			const supported = Object.keys(PROVIDER_TEMPLATES).join(", ");
			throw new Error(
				`Unknown provider "${provider}" in MULTI_SUB. Supported: ${supported}`,
			);
		}
		return { provider, count };
	});
}

// --------------------------------------------------------------------------
// Model cloning
// --------------------------------------------------------------------------

function cloneModelsForProvider(
	originalProvider: string,
	newProviderName: string,
	index: number,
): Array<{
	id: string;
	name: string;
	api?: Api;
	reasoning: boolean;
	input: ("text" | "image")[];
	cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
	contextWindow: number;
	maxTokens: number;
	headers?: Record<string, string>;
	compat?: Model<Api>["compat"];
}> {
	const models = getModels(originalProvider as any) as Model<Api>[];
	return models.map((m) => ({
		id: m.id,
		name: `${m.name} (#${index})`,
		api: m.api,
		reasoning: m.reasoning,
		input: m.input as ("text" | "image")[],
		cost: { ...m.cost },
		contextWindow: m.contextWindow,
		maxTokens: m.maxTokens,
		headers: m.headers ? { ...m.headers } : undefined,
		compat: m.compat,
	}));
}

// --------------------------------------------------------------------------
// Extension entry point
// --------------------------------------------------------------------------

export default function multiSub(pi: ExtensionAPI) {
	const configs = parseConfig();
	if (configs.length === 0) return;

	for (const { provider, count } of configs) {
		const template = PROVIDER_TEMPLATES[provider];

		for (let i = 2; i <= count + 1; i++) {
			const newProviderName = `${provider}-${i}`;
			const oauth = template.buildOAuth(i);
			const modifyModels = template.buildModifyModels?.(newProviderName);

			// Get base URL from built-in models (use the first model's baseUrl)
			const builtinModels = getModels(provider as any) as Model<Api>[];
			const baseUrl = builtinModels[0]?.baseUrl || "";

			const models = cloneModelsForProvider(provider, newProviderName, i);

			pi.registerProvider(newProviderName, {
				baseUrl,
				api: builtinModels[0]?.api,
				oauth: modifyModels ? { ...oauth, modifyModels } : oauth,
				models,
			});
		}
	}
}
