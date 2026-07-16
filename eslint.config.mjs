import next from 'eslint-config-next';

const eslintConfig = [
  {
    ignores: [".next-e2e/**"],
  },
  ...next,
];

export default eslintConfig;
