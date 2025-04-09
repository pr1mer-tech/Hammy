import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {},
	client: {
		NEXT_PUBLIC_UNISWAP_V2_FACTORY: z.string(),
		NEXT_PUBLIC_UNISWAP_V2_ROUTER: z.string(),
		NEXT_PUBLIC_WETH_ADDRESS: z.string(),
	},

	/**
	 * What object holds the environment variables at runtime. This is usually
	 * `process.env` or `import.meta.env`.
	 */
	runtimeEnv: {
		NEXT_PUBLIC_UNISWAP_V2_FACTORY:
			process.env.NEXT_PUBLIC_UNISWAP_V2_FACTORY,
		NEXT_PUBLIC_UNISWAP_V2_ROUTER:
			process.env.NEXT_PUBLIC_UNISWAP_V2_ROUTER,
		NEXT_PUBLIC_WETH_ADDRESS: process.env.NEXT_PUBLIC_WETH_ADDRESS,
	},

	/**
	 * By default, this library will feed the environment variables directly to
	 * the Zod validator.
	 *
	 * This means that if you have an empty string for a value that is supposed
	 * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
	 * it as a type mismatch violation. Additionally, if you have an empty string
	 * for a value that is supposed to be a string with a default value (e.g.
	 * `DOMAIN=` in an ".env" file), the default value will never be applied.
	 *
	 * In order to solve these issues, we recommend that all new projects
	 * explicitly specify this option as true.
	 */
	emptyStringAsUndefined: true,

	skipValidation: process.env.BUN_TEST === "true",
});
