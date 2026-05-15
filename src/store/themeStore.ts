import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppearanceAccent, AppearanceDensity, AppearanceTheme } from '../types/profile';

interface ThemeState {
    theme: AppearanceTheme;
    accent: AppearanceAccent;
    density: AppearanceDensity;
    reducedMotion: boolean;
    toggleTheme: () => void;
    setTheme: (theme: AppearanceTheme) => void;
    setAccent: (accent: AppearanceAccent) => void;
    setDensity: (density: AppearanceDensity) => void;
    setReducedMotion: (reducedMotion: boolean) => void;
    applyAppearance: (appearance: {
        theme?: AppearanceTheme;
        accent?: AppearanceAccent;
        density?: AppearanceDensity;
        reducedMotion?: boolean;
    }) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'light',
            accent: 'blue',
            density: 'comfortable',
            reducedMotion: false,
            toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
            setTheme: (theme) => set({ theme }),
            setAccent: (accent) => set({ accent }),
            setDensity: (density) => set({ density }),
            setReducedMotion: (reducedMotion) => set({ reducedMotion }),
            applyAppearance: (appearance) => set((state) => ({ ...state, ...appearance })),
        }),
        {
            name: 'ui-theme',
        }
    )
);
