import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import styles from './Room.module.css';

export default function Room({ roomCode, playerId, isHost, players: initialPlayers }) {
    const [players, setPlayers] = useState(initialPlayers || []);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // Инициализируем список игроков из пропсов
        if (initialPlayers && initialPlayers.length > 0) {
            setPlayers(initialPlayers);
        }

        // Отправляем запрос на получение текущего списка игроков
        if (window.axios) {
            window.axios.get(`/api/room/${roomCode}/players`)
                .then(response => {
                    console.log('Получен список игроков:', response.data.players);
                    if (response.data.players && response.data.players.length > 0) {
                        setPlayers(response.data.players);
                    }
                })
                .catch(error => {
                    console.error('Ошибка при получении списка игроков:', error);
                });
        }

        // Настраиваем WebSocket соединение
        if (!window.Echo) {
            console.error('Echo не инициализирован');
            return;
        }

        console.log('Подключение к каналу:', `room.${roomCode}`);
        const channel = window.Echo.channel(`room.${roomCode}`);

        // Отладка подписки на канал
        channel.subscribed(() => {
            console.log('✅ Подписан на канал:', `room.${roomCode}`);
        });

        channel.error((error) => {
            console.error('❌ Ошибка канала:', error);
        });

        // Слушаем все события на канале для отладки
        channel.listenToAll((eventName, data) => {
            console.log('🔔 Все события на канале:', eventName, data);
        });

        channel
            .listen('player.joined', (e) => {
                console.log('📨 Событие player.joined получено (без точки):', e);
                setPlayers((prev) => {
                    // Проверяем, нет ли уже такого игрока
                    if (prev.some(p => p.id === e.player?.id)) {
                        console.log('Игрок уже в списке, пропускаем');
                        return prev;
                    }
                    console.log('Добавляем игрока:', e.player);
                    return [...prev, e.player];
                });
            })
            .listen('.player.joined', (e) => {
                console.log('📨 Событие .player.joined получено (с точкой):', e);
                setPlayers((prev) => {
                    // Проверяем, нет ли уже такого игрока
                    if (prev.some(p => p.id === e.player?.id)) {
                        console.log('Игрок уже в списке, пропускаем');
                        return prev;
                    }
                    console.log('Добавляем игрока:', e.player);
                    return [...prev, e.player];
                });
            })
            .listen('player.left', (e) => {
                console.log('📨 Событие player.left получено (без точки):', e);
                setPlayers((prev) => {
                    const filtered = prev.filter(p => p.id !== e.playerId);
                    console.log('Удаляем игрока. Было:', prev.length, 'Стало:', filtered.length);
                    return filtered;
                });
            })
            .listen('.player.left', (e) => {
                console.log('📨 Событие .player.left получено (с точкой):', e);
                setPlayers((prev) => {
                    const filtered = prev.filter(p => p.id !== e.playerId);
                    console.log('Удаляем игрока. Было:', prev.length, 'Стало:', filtered.length);
                    return filtered;
                });
            })
            .listen('.game.started', () => {
                console.log('🎮 Игра началась!');
                alert('Игра началась!');
            })
            .listen('.game.selection.started', () => {
                console.log('🎮 Переход на страницу выбора игр');
                // Все игроки переходят на страницу выбора игр
                router.get(`/room/${roomCode}/games`, {
                    playerId,
                });
            })
            .listen('.spy.game.started', (e) => {
                console.log('🕵️ Игра Шпион началась!', e);
                // Автоматически переходим на страницу игры
                router.get(`/room/${roomCode}/spy/game`, {
                    playerId,
                });
            });

        // Обработка закрытия вкладки/браузера
        const handleBeforeUnload = () => {
            if (roomCode && playerId) {
                // Используем sendBeacon для надежной отправки при закрытии
                const formData = new FormData();
                formData.append('roomCode', roomCode);
                formData.append('playerId', playerId);
                navigator.sendBeacon('/room/leave', formData);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            // Отправляем событие о выходе при размонтировании компонента
            if (window.axios && roomCode && playerId) {
                window.axios.post('/room/leave', {
                    roomCode,
                    playerId
                }).catch(() => {
                    // Игнорируем ошибки при выходе
                });
            }
            
            window.removeEventListener('beforeunload', handleBeforeUnload);
            console.log('Отключение от канала:', `room.${roomCode}`);
            window.Echo.leave(`room.${roomCode}`);
        };
    }, [roomCode, playerId, initialPlayers]);

    const handleStartGame = () => {
        // Убрана проверка на минимальное количество игроков
        // Теперь можно начать выбор игры с любым количеством игроков

        // Отправляем событие для всех игроков о переходе на страницу выбора игр
        if (window.axios) {
            window.axios.post('/room/start', {
                roomCode,
            })
            .then(() => {
                // Хост переходит на страницу выбора игр
                router.get(`/room/${roomCode}/games`, {
                    playerId,
                });
            })
            .catch(error => {
                console.error('Ошибка при запуске игры:', error);
                alert('Ошибка при запуске игры');
            });
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(roomCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleLeave = () => {
        // Отправляем запрос на выход из комнаты
        if (window.axios && roomCode && playerId) {
            window.axios.post('/room/leave', {
                roomCode,
                playerId
            }).catch(error => {
                console.error('Ошибка при выходе из комнаты:', error);
            });
        }
        
        // Переходим на главную страницу
        router.get('/');
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>oblik game</h1>
                    <div className={styles.roomInfo}>
                        <div className={styles.roomCodeSection}>
                            <span className={styles.roomCodeLabel}>Код комнаты:</span>
                            <div className={styles.roomCodeContainer}>
                                <span className={styles.roomCode}>{roomCode}</span>
                                <button 
                                    onClick={handleCopyCode}
                                    className={styles.copyButton}
                                    title="Копировать код"
                                >
                                    {copied ? '✓' : '📋'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.playersSection}>
                    <h2 className={styles.playersTitle}>
                        Игроки ({players.length})
                    </h2>
                    <div className={styles.playersList}>
                        {players.map((player) => (
                            <div 
                                key={player.id} 
                                className={`${styles.playerCard} ${player.isHost ? styles.host : ''}`}
                            >
                                <div className={styles.playerAvatar}>
                                    {player.name.charAt(0).toUpperCase()}
                                </div>
                                <div className={styles.playerInfo}>
                                    <span className={styles.playerName}>
                                        {player.name}
                                        {player.isHost && (
                                            <span className={styles.hostBadge}>👑</span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.actions}>
                    {isHost && (
                        <button 
                            onClick={handleStartGame}
                            className={`${styles.button} ${styles.buttonPrimary}`}
                        >
                            Начать игру
                        </button>
                    )}
                    <button 
                        onClick={handleLeave}
                        className={`${styles.button} ${styles.buttonSecondary}`}
                    >
                        Покинуть комнату
                    </button>
                </div>
            </div>
        </div>
    );
}
