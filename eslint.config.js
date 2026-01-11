const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    ignores: ['node_modules/**', 'scripts/**', '**/*.min.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        // App globals
        Chart: 'readonly',
        Auth: 'readonly',
        Router: 'readonly',
        AnimalStatsApp: 'readonly',
        RankingsManager: 'readonly',
        TournamentManager: 'readonly',
        CommunityManager: 'readonly',
        ComparePageEnhancements: 'readonly',
        CommunityPageEnhancements: 'readonly',
        FALLBACK_IMAGE: 'readonly',
        API_CONFIG: 'readonly',
        formatNumber: 'readonly',
        formatStat: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-constant-condition': 'warn',
      'no-unreachable': 'warn',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'valid-typeof': 'error',
      'eqeqeq': ['warn', 'smart'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-return-await': 'warn',
      'prefer-const': ['warn', { destructuring: 'all' }],
      'no-var': 'warn',
      'no-throw-literal': 'warn'
    }
  },
  {
    // API routes use CommonJS
    files: ['api/**/*.js', 'lib/**/*.js', 'models/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs'
    }
  }
];
