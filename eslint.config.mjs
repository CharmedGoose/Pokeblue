import { FlatCompat } from "@eslint/eslintrc";
import sapphireEslintConfig from "@sapphire/eslint-config";

const compat = new FlatCompat();

export default [...compat.config(sapphireEslintConfig)];
