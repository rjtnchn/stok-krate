import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // These loaders intentionally set an immediate loading state before
      // starting their asynchronous request from an effect.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // These modules deliberately colocate shared contexts/navigation helpers
    // with their React consumers. The exports are stable; only Vite HMR's
    // boundary preference is affected.
    files: ['src/api/**/*.{js,jsx}', 'src/components/layout/SideNav.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
