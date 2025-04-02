let userConfig = undefined;
try {
	userConfig = await import("./v0-user-next.config");
} catch (e) {
	// ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		unoptimized: true,
	},
	experimental: {
		webpackBuildWorker: true,
		parallelServerBuildTraces: true,
		parallelServerCompiles: true,
	},
	webpack: (config) => {
		// config.resolve.fallback = { fs: false };
		// config.externals.push(
		// 	"pino-pretty",
		// 	"lokijs",
		//  	"encoding",
		//  	"bufferutil",
		//  	"utf-8-validate",
		// );

		return config;
	},

	// PostHog rewrites
	async rewrites() {
		return [
			{
				source: "/ingest/static/:path*",
				destination: "https://eu-assets.i.posthog.com/static/:path*",
			},
			{
				source: "/ingest/:path*",
				destination: "https://eu.i.posthog.com/:path*",
			},
			{
				source: "/ingest/decide",
				destination: "https://eu.i.posthog.com/decide",
			},
		];
	},

	// This is required to support PostHog trailing slash API requests
	skipTrailingSlashRedirect: true,
};

mergeConfig(nextConfig, userConfig);

function mergeConfig(nextConfig, userConfig) {
	if (!userConfig) {
		return;
	}

	for (const key in userConfig) {
		if (
			typeof nextConfig[key] === "object" &&
				!Array.isArray(nextConfig[key])
		) {
			nextConfig[key] = {
				...nextConfig[key],
				...userConfig[key],
			};
		} else {
			nextConfig[key] = userConfig[key];
		}
	}
}

export default nextConfig;
