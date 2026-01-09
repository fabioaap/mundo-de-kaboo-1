import { useEffect } from 'react';

/**
 * Hook to set the browser background color to match the screen theme
 * This ensures the mobile browser background matches the screen background
 */
export const useThemeBackground = (color: string | null) => {
  useEffect(() => {
    if (!color) {
      // Reset to default
      document.documentElement.style.backgroundColor = '#f3f4f6';
      document.body.style.backgroundColor = '#f3f4f6';
      
      // Remove theme-color meta tag
      const existingMeta = document.querySelector('meta[name="theme-color"]');
      if (existingMeta) {
        existingMeta.remove();
      }
      return;
    }

    // Convert hex to RGB if needed
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 93, g: 31, b: 88 };
    };

    const rgb = hexToRgb(color);
    const bgColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

    // Set body and html background
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;

    // Update or create theme-color meta tag for mobile browsers
    let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.content = color;

    // Cleanup function
    return () => {
      document.documentElement.style.backgroundColor = '#f3f4f6';
      document.body.style.backgroundColor = '#f3f4f6';
      const existingMeta = document.querySelector('meta[name="theme-color"]');
      if (existingMeta) {
        existingMeta.remove();
      }
    };
  }, [color]);
};
