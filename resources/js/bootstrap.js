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

// Настройка автоматического переподключения
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const reconnectDelay = 3000; // 3 секунды
let reconnectTimeout = null;
let isReconnecting = false;

const attemptReconnect = () => {
    if (isReconnecting || reconnectAttempts >= maxReconnectAttempts) {
        if (reconnectAttempts >= maxReconnectAttempts) {
            console.error('❌ Достигнуто максимальное количество попыток переподключения');
        }
        return;
    }

    isReconnecting = true;
    reconnectAttempts++;
    console.log(`🔄 Попытка переподключения ${reconnectAttempts}/${maxReconnectAttempts}...`);

    reconnectTimeout = setTimeout(() => {
        try {
            window.Echo.connector.pusher.connect();
        } catch (error) {
            console.error('❌ Ошибка при переподключении:', error);
            isReconnecting = false;
            attemptReconnect();
        }
    }, reconnectDelay);
};

// Отладка подключения
window.Echo.connector.pusher.connection.bind('connected', () => {
    console.log('✅ WebSocket подключен к Reverb');
    reconnectAttempts = 0;
    isReconnecting = false;
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    
    // Синхронизация при восстановлении соединения
    // Отправляем событие для синхронизации состояния
    if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('websocket:reconnected'));
    }
});

window.Echo.connector.pusher.connection.bind('disconnected', () => {
    console.log('❌ WebSocket отключен от Reverb');
    if (!isReconnecting) {
        attemptReconnect();
    }
});

window.Echo.connector.pusher.connection.bind('error', (error) => {
    console.error('❌ Ошибка WebSocket соединения:', error);
    if (!isReconnecting && window.Echo.connector.pusher.connection.state !== 'connected') {
        attemptReconnect();
    }
});

// Обработка состояния соединения
window.Echo.connector.pusher.connection.bind('state_change', (states) => {
    console.log('🔄 Изменение состояния WebSocket:', states.previous, '->', states.current);
    
    if (states.current === 'disconnected' || states.current === 'failed') {
        if (!isReconnecting) {
            attemptReconnect();
        }
    }
});
