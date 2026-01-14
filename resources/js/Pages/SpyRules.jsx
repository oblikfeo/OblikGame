import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import styles from './SpyRules.module.css';

export default function SpyRules({ roomCode, playerId, players: initialPlayers }) {
    const [players, setPlayers] = useState(initialPlayers || []);
    const [isLoading, setIsLoading] = useState(false);
    const [readyPlayers, setReadyPlayers] = useState([]);
    const [isReady, setIsReady] = useState(false);
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

        // Проверяем, готов ли текущий игрок (из кеша или сессии)
        // Это нужно для восстановления состояния после перезагрузки страницы
        // В реальности состояние будет синхронизироваться через WebSocket события

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
                setPlayers((prev) => {
                    const filtered = prev.filter(p => p.id !== e.playerId);
                    // Если вышедший игрок был готов, удаляем его из списка готовых
                    setReadyPlayers((prevReady) => prevReady.filter(id => id !== e.playerId));
                    return filtered;
                });
            })
            .listen('.spy.ready.to.start', (e) => {
                // Обновляем список готовых игроков
                setReadyPlayers(e.readyPlayers || []);
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

    const handleReady = () => {
        if (players.length < 3) {
            alert(`Нужно минимум 3 игрока для начала игры. Сейчас в комнате: ${players.length}`);
            return;
        }

        if (isReady) {
            return; // Уже готов
        }

        setIsLoading(true);

        // Отправляем сигнал о готовности
        if (window.axios) {
            window.axios.post(`/room/${roomCode}/spy/ready-to-start`, {
                playerId,
            })
            .then(response => {
                setIsReady(true);
                setIsLoading(false);
                setReadyPlayers(response.data.readyPlayers || []);
            })
            .catch(error => {
                console.error('Ошибка при отправке готовности:', error);
                setIsLoading(false);
                
                // Показываем понятное сообщение об ошибке
                const errorMessage = error.response?.data?.error || 
                                   error.response?.data?.message || 
                                   'Ошибка при отправке готовности';
                alert(errorMessage);
            });
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
