import { useEffect } from 'react';
import { router } from '@inertiajs/react';
import styles from './GameSelection.module.css';

export default function GameSelection({ roomCode, playerId, isHost, players }) {
    useEffect(() => {
        // Слушаем событие начала игры через WebSocket
        if (!window.Echo) {
            return;
        }

        const channel = window.Echo.channel(`room.${roomCode}`);

        channel.listen('.spy.game.started', () => {
            // Игра Шпион началась, переходим на страницу игры
            router.get(`/room/${roomCode}/spy/game`, {
                playerId,
            });
        });

        return () => {
            window.Echo.leave(`room.${roomCode}`);
        };
    }, [roomCode, playerId]);
    // Список доступных игр
    const availableGames = [
        {
            id: 'spy',
            name: 'Шпион',
            description: 'Угадай кто шпион среди игроков',
            icon: '🕵️',
            minPlayers: 3,
            maxPlayers: 10,
            enabled: true,
        },
        {
            id: 'truth-or-dare',
            name: 'Правда или Действие',
            description: 'Классическая игра на смелость и честность',
            icon: '🎲',
            minPlayers: 2,
            maxPlayers: 10,
            enabled: false,
        },
        {
            id: 'mafia',
            name: 'Мафия',
            description: 'Детективная игра с ролями и обсуждениями',
            icon: '🎭',
            minPlayers: 6,
            maxPlayers: 15,
            enabled: false,
        },
        {
            id: 'quiz',
            name: 'Викторина',
            description: 'Проверь свои знания в различных темах',
            icon: '🧠',
            minPlayers: 2,
            maxPlayers: 10,
            enabled: false,
        },
        {
            id: 'blue-whale',
            name: 'Синий кит',
            description: 'Загадочная игра с заданиями и вызовами',
            icon: '🐋',
            minPlayers: 3,
            maxPlayers: 8,
            enabled: false,
        },
    ];

    const handleSelectGame = (gameId) => {
        // Переход на страницу правил игры
        if (gameId === 'spy') {
            router.get(`/room/${roomCode}/spy/rules`, {
                playerId,
            });
        } else {
            // Для других игр будет свой маршрут
            router.get(`/room/${roomCode}/game/${gameId}`, {
                playerId,
            });
        }
    };

    const handleBack = () => {
        // Возврат в комнату
        router.get(`/room/${roomCode}`, {
            playerId,
        });
    };

    // Проверяем, может ли текущее количество игроков играть в игру
    const canPlayGame = (game) => {
        // Если игра не включена, она недоступна
        if (!game.enabled) {
            return false;
        }
        const playerCount = players?.length || 0;
        return playerCount >= game.minPlayers && playerCount <= game.maxPlayers;
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <button 
                        onClick={handleBack}
                        className={styles.backButton}
                        title="Назад в комнату"
                    >
                        ←
                    </button>
                    <h1 className={styles.title}>Выберите игру</h1>
                    <div className={styles.roomInfo}>
                        <span className={styles.roomCodeLabel}>Комната:</span>
                        <span className={styles.roomCode}>{roomCode}</span>
                    </div>
                </div>

                <div className={styles.gamesSection}>
                    <p className={styles.subtitle}>
                        Игроков в комнате: <strong>{players?.length || 0}</strong>
                    </p>
                    
                    <div className={styles.gamesList}>
                        {availableGames.map((game) => {
                            const canPlay = canPlayGame(game);
                            const playerCount = players?.length || 0;
                            
                            return (
                                <div
                                    key={game.id}
                                    className={`${styles.gameCard} ${!canPlay ? styles.disabled : ''}`}
                                    onClick={() => canPlay && handleSelectGame(game.id)}
                                >
                                    <div className={styles.gameIcon}>{game.icon}</div>
                                    <div className={styles.gameInfo}>
                                        <h3 className={styles.gameName}>{game.name}</h3>
                                        <p className={styles.gameDescription}>{game.description}</p>
                                        <div className={styles.gamePlayers}>
                                            <span className={styles.playersInfo}>
                                                {game.minPlayers}-{game.maxPlayers} игроков
                                            </span>
                                            {!canPlay && (
                                                <span className={styles.warning}>
                                                    {!game.enabled 
                                                        ? 'Скоро будет доступно'
                                                        : playerCount < game.minPlayers 
                                                            ? `Нужно минимум ${game.minPlayers} игроков`
                                                            : `Максимум ${game.maxPlayers} игроков`
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {canPlay && (
                                        <div className={styles.playButton}>
                                            ▶
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
