import { view } from '@forge/bridge';

export type ColorMode = 'light' | 'dark';

/**
 * Enables Atlassian design tokens and mirrors the host color mode on <html data-ko-theme>
 * and on Swagger UI's own dark mode class (`html.dark-mode`).
 */
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
  document.documentElement.classList.toggle('dark-mode', mode === 'dark');
  return mode;
}
