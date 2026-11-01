import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['node_modules', 'out', 'dist', 'coverage', 'prototipo', 'test-results', 'playwright-report'] },
  ...tseslint.configs.recommended,
  {
    // scripts CommonJS (rodam com node direto)
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' }
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules
  },
  {
    // dominio/ é puro: sem Electron, sem Node, sem React.
    files: ['src/dominio/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['electron', 'node:*', 'react', 'react-*', '../*'] }],
      'no-restricted-globals': ['error', { name: 'Date', message: 'Receba a data como parâmetro.' }]
    }
  }
)
