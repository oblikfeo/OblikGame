import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import styles from './SpyRules.module.css';

export default function SpyRules({ roomCode, playerId, players: initialPlayers }) {
    const [players, setPlayers] = useState(initialPlayers || []);
    const [isLoading, setIsLoading] = useState(false);
    useEffect(() => {
        // Инициализируем список игроков
        if (initialPlayers && initialPlayers.length > 0) {
            setPlayers(initialPlayers);
        }

        // Получаем актуальный список игроков
        if (window.axios) {
            window.axios.get(`/api/room/${roomCode}/players`)
                .then(response => {
                    if (response.data.players && response.data.players.length > 0) {
                        setPlayers(response.data.players);
                    }
                })
                .catch(error => {
                    console.error('Ошибка при получении списка игроков:', error);
                });
        }

        // Слушаем событие начала игры через WebSocket
        if (!window.Echo) {
            return;
        }

        const channel = window.Echo.channel(`room.${roomCode}`);

        channel
            .listen('.player.joined', (e) => {
                // Обновляем список игроков при присоединении
                setPlayers((prev) => {
                    if (prev.some(p => p.id === e.player?.id)) {
                        return prev;
                    }
                    return [...prev, e.player];
                });
            })
            .listen('.player.left', (e) => {
                // Обновляем список игроков при выходе
                setPlayers((prev) => prev.filter(p => p.id !== e.playerId));
            })
            .listen('.spy.game.started', () => {
                // Игра началась, переходим на страницу игры
                router.get(`/room/${roomCode}/spy/game`, {
                    playerId,
                });
            });

        return () => {
            window.Echo.leave(`room.${roomCode}`);
        };
    }, [roomCode, playerId, initialPlayers]);

    const handleStartGame = () => {
        if (players.length < 3) {
            alert(`Нужно минимум 3 игрока для начала игры. Сейчас в комнате: ${players.length}`);
            return;
        }

        setIsLoading(true);

        // Запускаем игру
        if (window.axios) {
            window.axios.post(`/room/${roomCode}/spy/start`)
                .then(response => {
                    // Переходим на страницу игры (остальные перейдут через WebSocket)
                    router.get(`/room/${roomCode}/spy/game`, {
                        playerId,
                    });
                })
                .catch(error => {
                    console.error('Ошибка при запуске игры:', error);
                    setIsLoading(false);
                    
                    // Показываем понятное сообщение об ошибке
                    const errorMessage = error.response?.data?.error || 
                                       error.response?.data?.message || 
                                       'Ошибка при запуске игры';
                    alert(errorMessage);
                });
        }
    };

    const canStartGame = players.length >= 3;

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>🕵️ Шпион</h1>
                </div>

                <div className={styles.rulesSection}>
                    <h2 className={styles.sectionTitle}>Правила игры</h2>
                    
                    <div className={styles.rulesList}>
                        <div className={styles.ruleItem}>
                            <div className={styles.ruleNumber}>1</div>
                            <div className={styles.ruleText}>
                                Один из игроков становится <strong>Шпионом</strong>, остальные знают <strong>локацию</strong>
                            </div>
                        </div>

                        <div className={styles.ruleItem}>
                            <div className={styles.ruleNumber}>2</div>
                            <div className={styles.ruleText}>
                                Игроки задают друг другу вопросы о локации, <strong>не называя её напрямую</strong>
                            </div>
                        </div>

                        <div className={styles.ruleItem}>
                            <div className={styles.ruleNumber}>3</div>
                            <div className={styles.ruleText}>
                                <strong>Шпион</strong> не знает локацию и пытается не выдать себя
                            </div>
                        </div>

                        <div className={styles.ruleItem}>
                            <div className={styles.ruleNumber}>4</div>
                            <div className={styles.ruleText}>
                                После круга вопросов начинается <strong>голосование</strong>
                            </div>
                        </div>

                        <div className={styles.ruleItem}>
                            <div className={styles.ruleNumber}>5</div>
                            <div className={styles.ruleText}>
                                <strong>Цель игроков:</strong> вычислить Шпиона<br/>
                                <strong>Цель Шпиона:</strong> угадать локацию или не выдать себя
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.playersInfo}>
                    <p>
                        Игроков в комнате: <strong>{players.length}</strong>
                        {!canStartGame && (
                            <span className={styles.warning}>
                                {' '}(Нужно минимум 3)
                            </span>
                        )}
                    </p>
                </div>

                <div className={styles.actions}>
                    <button 
                        onClick={handleStartGame}
                        className={`${styles.startButton} ${!canStartGame ? styles.disabled : ''}`}
                        disabled={!canStartGame || isLoading}
                    >
                        {isLoading ? 'Запуск...' : canStartGame ? 'Начать игру' : `Нужно еще ${3 - players.length} игрок${3 - players.length === 1 ? '' : 'а'}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
