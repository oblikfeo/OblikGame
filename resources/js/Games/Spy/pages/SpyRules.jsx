import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { useSpyWebSocket } from '../hooks/useSpyWebSocket';
import { useSpyGame } from '../hooks/useSpyGame';
import styles from '../SpyRules.module.css';

export default function SpyRules({ roomCode, playerId, players: initialPlayers }) {
    const [players, setPlayers] = useState(initialPlayers || []);
    const [readyPlayers, setReadyPlayers] = useState([]);
    const [isReady, setIsReady] = useState(false);
    const { readyToStart, getGameData, isLoading, error } = useSpyGame(roomCode, playerId);

    // Обработка WebSocket событий
    useSpyWebSocket(roomCode, playerId, {
        onPlayerJoined: (e) => {
            setPlayers((prev) => {
                if (prev.some(p => p.id === e.player?.id)) {
                    return prev;
                }
                return [...prev, e.player];
            });
        },
        onPlayerLeft: (e) => {
            setPlayers((prev) => {
                const filtered = prev.filter(p => p.id !== e.playerId);
                setReadyPlayers((prevReady) => prevReady.filter(id => id !== e.playerId));
                return filtered;
            });
        },
        onReadyToStart: (e) => {
            setReadyPlayers(e.readyPlayers || []);
        },
        onGameStarted: () => {
            router.get(`/room/${roomCode}/spy/game`, { playerId });
        },
    });

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

        // Проверка статуса игры при загрузке (только если игра уже начата)
        // Выполняем только один раз при монтировании
        let isMounted = true;
        let hasChecked = false;
        
        const checkGameStatus = async () => {
            // Проверяем только один раз
            if (hasChecked) return;
            hasChecked = true;
            
            try {
                const gameData = await getGameData();
                if (!isMounted) return;
                
                // Если игра не начата (null), остаемся на странице правил
                if (!gameData) {
                    return;
                }
                
                // Если игра уже идет, перенаправляем на нужную страницу
                if (gameData.gameStatus === 'playing') {
                    router.get(`/room/${roomCode}/spy/game`, { playerId });
                } else if (gameData.gameStatus === 'voting') {
                    router.get(`/room/${roomCode}/spy/voting`, { playerId });
                } else if (gameData.gameStatus === 'results') {
                    router.get(`/room/${roomCode}/spy/results`, { playerId });
                } else if (gameData.gameStatus === 'guess') {
                    router.get(`/room/${roomCode}/spy/spy-guess`, { playerId });
                }
                // Если gameStatus === 'rules' или null, остаемся на этой странице
            } catch (error) {
                if (!isMounted) return;
                
                // Игнорируем ошибки при проверке статуса (игра может быть еще не начата)
                // Логируем только серьезные ошибки
                if (error.response?.status !== 404) {
                    console.error('Ошибка при проверке статуса игры:', error);
                }
            }
        };

        // Задержка перед проверкой, чтобы избежать конфликтов
        const timer = setTimeout(() => {
            checkGameStatus();
        }, 100);
        
        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [roomCode, initialPlayers, playerId]); // Убираем getGameData из зависимостей

    const handleReady = async () => {
        if (players.length < 3) {
            alert(`Нужно минимум 3 игрока для начала игры. Сейчас в комнате: ${players.length}`);
            return;
        }

        if (isReady) {
            return;
        }

        try {
            const response = await readyToStart();
            setIsReady(true);
            setReadyPlayers(response?.readyPlayers || []);
        } catch (err) {
            // Ошибка уже обработана в хуке
            if (error) {
                alert(error);
            }
        }
    };

    const canStartGame = players.length >= 3;
    const allReady = readyPlayers.length === players.length && players.length >= 3;

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
                                После голосования выбывает игрок с наибольшим количеством голосов
                            </div>
                        </div>

                        <div className={styles.ruleItem}>
                            <div className={styles.ruleNumber}>6</div>
                            <div className={styles.ruleText}>
                                Если выбывший игрок - <strong>Шпион</strong>, он может назвать локацию перед выбыванием
                            </div>
                        </div>

                        <div className={styles.ruleItem}>
                            <div className={styles.ruleNumber}>7</div>
                            <div className={styles.ruleText}>
                                Остальные игроки голосуют: <strong>ДА</strong> (угадал) или <strong>НЕТ</strong> (не угадал)
                            </div>
                        </div>

                        <div className={styles.ruleItem}>
                            <div className={styles.ruleNumber}>8</div>
                            <div className={styles.ruleText}>
                                <strong>Цель игроков:</strong> вычислить Шпиона и сохранить локацию в тайне<br/>
                                <strong>Цель Шпиона:</strong> угадать локацию перед выбыванием (если большинство скажет ДА - все шпионы выиграли)
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
                    {readyPlayers.length > 0 && (
                        <div className={styles.readyPlayers}>
                            <p className={styles.readyTitle}>
                                Готовы к игре: <strong>{readyPlayers.length} / {players.length}</strong>
                            </p>
                            <div className={styles.readyList}>
                                {players
                                    .filter(p => readyPlayers.includes(p.id))
                                    .map(player => (
                                        <span key={player.id} className={styles.readyPlayer}>
                                            ✓ {player.name}
                                        </span>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.actions}>
                    {allReady ? (
                        <div className={styles.waitingMessage}>
                            Все готовы! Игра скоро начнется...
                        </div>
                    ) : (
                        <button 
                            onClick={handleReady}
                            className={`${styles.startButton} ${!canStartGame || isReady ? styles.disabled : ''}`}
                            disabled={!canStartGame || isLoading || isReady}
                        >
                            {isLoading 
                                ? 'Отправка...' 
                                : isReady 
                                    ? '✓ Готов!' 
                                    : canStartGame 
                                        ? 'Готов!' 
                                        : `Нужно еще ${3 - players.length} игрок${3 - players.length === 1 ? '' : 'а'}`
                            }
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
