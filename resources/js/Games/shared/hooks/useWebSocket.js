import { useEffect, useRef } from 'react';

/**
 * Общий хук для работы с WebSocket соединением
 * Обеспечивает подключение к каналу и автоматическое переподключение
 */
export function useWebSocket(roomCode, callbacks = {}) {
    const channelRef = useRef(null);
    const listenersRef = useRef([]);
    const isSubscribedRef = useRef(false);
    const connectedHandlerRef = useRef(null);

    useEffect(() => {
        if (!window.Echo) {
            console.error('Echo не инициализирован');
            return;
        }

        const connect = () => {
            try {
                // Проверяем, что соединение активно
                if (window.Echo.connector.pusher.connection.state !== 'connected') {
                    console.warn('WebSocket не подключен, ожидание подключения...');
                    return;
                }

                const channel = window.Echo.channel(`room.${roomCode}`);
                channelRef.current = channel;

                // Очищаем предыдущие слушатели
                listenersRef.current.forEach(({ eventName, listener }) => {
                    try {
                        channel.stopListening(eventName, listener);
                    } catch (e) {
                        // Игнорируем ошибки при очистке
                    }
                });
                listenersRef.current = [];

                // Подписываемся на все переданные события
                Object.entries(callbacks).forEach(([eventName, callback]) => {
                    if (typeof callback === 'function' && eventName !== 'onConnected') {
                        const listener = (e) => {
                            try {
                                callback(e);
                            } catch (error) {
                                console.error(`Ошибка при обработке события ${eventName}:`, error);
                            }
                        };
                        channel.listen(eventName, listener);
                        listenersRef.current.push({ eventName, listener });
                    }
                });

                isSubscribedRef.current = true;

                // Обработка успешного подключения
                if (callbacks.onConnected) {
                    callbacks.onConnected();
                }

                console.log(`✅ Подключен к каналу room.${roomCode}`);
            } catch (error) {
                console.error('Ошибка при подключении к WebSocket:', error);
                isSubscribedRef.current = false;
            }
        };

        // Функция для синхронизации при восстановлении соединения
        const handleReconnect = () => {
            if (!isSubscribedRef.current) {
                console.log('🔄 Синхронизация после переподключения...');
                connect();
            }
        };

        // Подключаемся сразу, если соединение уже установлено
        if (window.Echo.connector.pusher.connection.state === 'connected') {
            connect();
        } else {
            // Ждем подключения
            connectedHandlerRef.current = () => {
                connect();
                if (connectedHandlerRef.current) {
                    window.Echo.connector.pusher.connection.unbind('connected', connectedHandlerRef.current);
                }
            };
            window.Echo.connector.pusher.connection.bind('connected', connectedHandlerRef.current);
        }

        // Слушаем событие переподключения
        window.addEventListener('websocket:reconnected', handleReconnect);

        return () => {
            // Очистка при размонтировании
            window.removeEventListener('websocket:reconnected', handleReconnect);
            
            // Удаляем обработчик подключения
            if (connectedHandlerRef.current) {
                try {
                    window.Echo.connector.pusher.connection.unbind('connected', connectedHandlerRef.current);
                } catch (e) {
                    // Игнорируем ошибки
                }
                connectedHandlerRef.current = null;
            }
            
            if (channelRef.current) {
                try {
                    // Удаляем все слушатели
                    listenersRef.current.forEach(({ eventName, listener }) => {
                        try {
                            channelRef.current.stopListening(eventName, listener);
                        } catch (e) {
                            // Игнорируем ошибки
                        }
                    });
                    listenersRef.current = [];
                    
                    window.Echo.leave(`room.${roomCode}`);
                } catch (error) {
                    console.error('Ошибка при отключении от канала:', error);
                }
                channelRef.current = null;
                isSubscribedRef.current = false;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomCode]);

    return channelRef.current;
}
