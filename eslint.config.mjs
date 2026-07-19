import next from 'eslint-config-next';

const eslintConfig = [
  {
    ignores: [".next-e2e/**", "playwright-report/**", "test-results/**"],
  },
  ...next,
];

export default eslintConfig;
