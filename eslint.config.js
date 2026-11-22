import js from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";

export default tseslint.config(
	{ ignores: ["dist"] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["**/*.test-d.ts"],
		rules: {
			"@typescript-eslint/no-unused-expressions": "off",
		},
	},
	{
		plugins: {
			"@stylistic": stylistic,
		},
		rules: {
			"@stylistic/quotes": ["error", "double", { allowTemplateLiterals: "always" }],
			"@stylistic/indent": ["error", "tab"],
		},
	},
);
