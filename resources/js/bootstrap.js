import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

// Получаем переменные окружения
const reverbKey = import.meta.env.VITE_REVERB_APP_KEY || 'p2m8ox9gxbsohme9hwl7';
const reverbHost = import.meta.env.VITE_REVERB_HOST || 'localhost';
const reverbPort = import.meta.env.VITE_REVERB_PORT || '8080';
const reverbScheme = import.meta.env.VITE_REVERB_SCHEME || 'http';

console.log('🔧 Конфигурация Reverb:', {
    key: reverbKey,
    host: reverbHost,
    port: reverbPort,
    scheme: reverbScheme
});

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: reverbKey,
    wsHost: reverbHost,
    wsPort: parseInt(reverbPort),
    wssPort: parseInt(reverbPort),
    forceTLS: reverbScheme === 'https',
    enabledTransports: ['ws', 'wss'],
});

// Отладка подключения
window.Echo.connector.pusher.connection.bind('connected', () => {
    console.log('✅ WebSocket подключен к Reverb');
});

window.Echo.connector.pusher.connection.bind('disconnected', () => {
    console.log('❌ WebSocket отключен от Reverb');
});

window.Echo.connector.pusher.connection.bind('error', (error) => {
    console.error('❌ Ошибка WebSocket соединения:', error);
});
