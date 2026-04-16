import tseslint from 'typescript-eslint'

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    rules: {
      // We intentionally use require() for @electron/remote (runtime-only, external)
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
)
