import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

createInertiaApp({
    resolve: (name) => {
        // Ищем файлы в Pages и Games
        const allPages = import.meta.glob(['./Pages/**/*.jsx', './Games/**/*.jsx'], { eager: false });
        
        // Пробуем найти файл по разным путям
        // 1. В Pages: ./Pages/${name}.jsx
        const pagesPath = `./Pages/${name}.jsx`;
        if (pagesPath in allPages) {
            return resolvePageComponent(pagesPath, allPages);
        }
        
        // 2. В Games: ./Games/${name}.jsx (для путей типа Games/Spy/pages/SpyRules)
        const gamesPath = `./Games/${name}.jsx`;
        if (gamesPath in allPages) {
            return resolvePageComponent(gamesPath, allPages);
        }
        
        // 3. Если имя содержит слеши, пробуем найти напрямую
        // Например, для "Games/Spy/pages/SpyRules" ищем "./Games/Spy/pages/SpyRules.jsx"
        if (name.includes('/')) {
            const directPath = `./${name}.jsx`;
            if (directPath in allPages) {
                return resolvePageComponent(directPath, allPages);
            }
        }
        
        // 4. Fallback - пробуем через Pages (для обратной совместимости)
        return resolvePageComponent(pagesPath, allPages);
    },
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(<App {...props} />);
    },
});
