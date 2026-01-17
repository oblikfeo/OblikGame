import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { useSpyWebSocket } from '../hooks/useSpyWebSocket';
import { useSpyGame } from '../hooks/useSpyGame';
import styles from '../SpyResults.module.css';

export default function SpyResults({ roomCode, playerId, results, players }) {
    const { voteCounts, activeVoteCounts, mostVotedId, maxVotes, isSpy, location, spyIds, spyId, eliminatedPlayerId, isTie, gameEnded, continueGame } = results;
    const [countdown, setCountdown] = useState(null);
    const [showVotingResult, setShowVotingResult] = useState(true);
    const { getGameData } = useSpyGame(roomCode, playerId);
    
    const mostVotedPlayer = players.find(p => p.id === mostVotedId);
    const eliminatedPlayer = players.find(p => p.id === eliminatedPlayerId);
    const spyIdsArray = spyIds || [spyId];
    const spyPlayers = players.filter(p => spyIdsArray.includes(p.id));
    const isCurrentPlayerSpy = spyIdsArray.includes(playerId);
    const isEliminatedPlayerSpy = eliminatedPlayerId && spyIdsArray.includes(eliminatedPlayerId);

    useSpyWebSocket(roomCode, playerId, {
        onGameContinue: () => {
            router.get(`/room/${roomCode}/spy/game`, { playerId });
        },
        onPlayerEliminated: () => {
            router.get('/');
        },
    });

    useEffect(() => {
        if (showVotingResult && eliminatedPlayerId && !isTie) {
            // Увеличиваем время показа результатов до 3 секунд (было 5)
            const timer = setTimeout(() => {
                setShowVotingResult(false);
                
                if (isEliminatedPlayerSpy) {
                    // Если выбыл шпион, сразу переходим к угадыванию
                    router.get(`/room/${roomCode}/spy/spy-guess`, { playerId });
                } else if (continueGame && !gameEnded) {
                    // Если игра продолжается, показываем обратный отсчет
                    setCountdown(3);
                } else if (gameEnded) {
                    // Игра закончена
                    setShowVotingResult(false);
                }
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [showVotingResult, eliminatedPlayerId, isTie, isEliminatedPlayerSpy, continueGame, gameEnded, roomCode, playerId]);

    useEffect(() => {
        if (countdown !== null && countdown > 0) {
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        router.get(`/room/${roomCode}/spy/game`, { playerId });
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [countdown, roomCode, playerId]);

    // Убираем проверку статуса - на странице results мы уже знаем, что статус = 'results'
    // Проверка статуса здесь вызывает бесконечные перезагрузки

    const handleBackToRoom = () => {
        router.get(`/room/${roomCode}`, { playerId });
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>📊 Результаты голосования</h1>
                </div>

                {/* Показываем только важную информацию - кто выбыл */}
                {eliminatedPlayerId && !isTie && (
                    <div className={styles.resultCard}>
                        <div className={styles.eliminationResult}>
                            {isEliminatedPlayerSpy ? (
                                <>
                                    <div className={styles.resultIcon}>🕵️</div>
                                    <div className={styles.eliminationTitle}>Выбывает игрок</div>
                                    <div className={styles.eliminatedPlayerName}>{eliminatedPlayer?.name}</div>
                                    <div className={styles.eliminationStatus}>Он <strong>ШПИОН!</strong></div>
                                    {showVotingResult && (
                                        <div className={styles.eliminationStatus} style={{ marginTop: '20px', fontSize: '16px', color: '#666' }}>
                                            Шпион может угадать локацию...
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className={styles.resultIcon}>❌</div>
                                    <div className={styles.eliminationTitle}>Выбывает игрок</div>
                                    <div className={styles.eliminatedPlayerName}>{eliminatedPlayer?.name}</div>
                                    <div className={styles.eliminationStatus}>Он <strong>не был шпионом</strong></div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Показываем информацию о завершении игры только если игра действительно закончена */}
                {gameEnded && !isEliminatedPlayerSpy && (
                    <div className={styles.resultCard}>
                        <div className={styles.resultIcon}>✅</div>
                        <div className={styles.resultTitle}>Игра завершена!</div>
                        <div className={styles.spyReveal}>
                            {spyIdsArray.length > 1 ? 'Шпионы' : 'Шпион'}: <strong>{spyPlayers.map(s => s.name).join(', ')}</strong>
                        </div>
                        <div className={styles.locationReveal}>
                            Локация была: <strong>{location}</strong>
                        </div>
                    </div>
                )}

                {/* Обратный отсчет только если игра продолжается */}
                {!showVotingResult && continueGame && !gameEnded && countdown !== null && (
                    <div className={styles.countdown}>
                        <p>Возврат к игре через {countdown} секунд...</p>
                    </div>
                )}

                {/* Кнопки действий */}
                <div className={styles.actions}>
                    {gameEnded ? (
                        <button 
                            onClick={handleBackToRoom}
                            className={styles.backButton}
                        >
                            Вернуться в комнату
                        </button>
                    ) : !isEliminatedPlayerSpy && continueGame ? (
                        <button 
                            onClick={() => router.get(`/room/${roomCode}/spy/game`, { playerId })}
                            className={styles.backButton}
                        >
                            Продолжить игру
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
