import { view } from '@forge/bridge';

export type ColorMode = 'light' | 'dark';

/** Enables Atlassian design tokens and mirrors the host color mode on <html data-ko-theme>. */
export async function applyTheme(): Promise<ColorMode> {
  let mode: ColorMode;
  try {
    await view.theme.enable();
    const context = await view.getContext();
    mode = context.theme?.colorMode === 'dark' ? 'dark' : 'light';
  } catch {
    // Outside Confluence (e.g. local dev) fall back to the OS preference.
    mode = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.koTheme = mode;
  return mode;
}
