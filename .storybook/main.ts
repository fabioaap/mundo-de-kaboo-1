import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  "stories": [
    "../design-system/**/*.mdx",
    "../design-system/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs"
  ],
  "framework": "@storybook/react-vite",
  async viteFinal(config) {
    const { default: tailwindcss } = await import('@tailwindcss/postcss')
    config.css = {
      postcss: {
        plugins: [tailwindcss()],
      },
    }
    return config
  },
};
export default config;