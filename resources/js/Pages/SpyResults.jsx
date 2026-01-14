import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import styles from './SpyResults.module.css';

export default function SpyResults({ roomCode, playerId, results, players }) {
    const { voteCounts, activeVoteCounts, mostVotedId, maxVotes, isSpy, location, spyIds, spyId, eliminatedPlayerId, isTie, gameEnded, continueGame } = results;
    const [countdown, setCountdown] = useState(null);
    const [showVotingResult, setShowVotingResult] = useState(true);
    
    const mostVotedPlayer = players.find(p => p.id === mostVotedId);
    const eliminatedPlayer = players.find(p => p.id === eliminatedPlayerId);
    const spyIdsArray = spyIds || [spyId]; // Поддержка старого формата
    const spyPlayers = players.filter(p => spyIdsArray.includes(p.id));
    const currentPlayer = players.find(p => p.id === playerId);
    const isCurrentPlayerSpy = spyIdsArray.includes(playerId);
    const isEliminatedPlayerSpy = eliminatedPlayerId && spyIdsArray.includes(eliminatedPlayerId);

    useEffect(() => {
        // Слушаем событие о продолжении игры
        if (!window.Echo) {
            return;
        }

        const channel = window.Echo.channel(`room.${roomCode}`);

        channel
            .listen('.spy.game.continue', () => {
                // Возвращаемся к игре
                router.get(`/room/${roomCode}/spy/game`, {
                    playerId,
                });
            })
            .listen('.player.eliminated', (e) => {
                // Игрок исключен, перенаправляем на главный экран
                if (e.playerId === playerId) {
                    alert('Вы были исключены из игры');
                    router.get('/');
                }
            });

        return () => {
            window.Echo.leave(`room.${roomCode}`);
        };
    }, [roomCode, playerId]);

    // Показываем результат голосования 5 секунд, затем переходим к следующему этапу
    useEffect(() => {
        if (showVotingResult && eliminatedPlayerId && !isTie) {
            const timer = setTimeout(() => {
                setShowVotingResult(false);
                
                // Если выбывший игрок - шпион, переходим к этапу угадывания слова
                if (isEliminatedPlayerSpy) {
                    // Переходим к этапу угадывания слова шпионом
                    router.get(`/room/${roomCode}/spy/spy-guess`, {
                        playerId,
                    });
                } else if (continueGame && !gameEnded) {
                    // Если не шпион и игра продолжается, возвращаемся к игре через 3 секунды
                    setCountdown(3);
                } else if (gameEnded) {
                    // Игра закончилась, показываем финал
                    setShowVotingResult(false);
                }
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [showVotingResult, eliminatedPlayerId, isTie, isEliminatedPlayerSpy, continueGame, gameEnded, roomCode, playerId]);

    // Таймер обратного отсчета для автоматического возврата к игре
    useEffect(() => {
        if (countdown !== null && countdown > 0) {
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        // Возвращаемся к игре
                        router.get(`/room/${roomCode}/spy/game`, {
                            playerId,
                        });
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [countdown, roomCode, playerId]);

    const handleBackToRoom = () => {
        router.get(`/room/${roomCode}`, {
            playerId,
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>📊 Результаты</h1>
                </div>

                {showVotingResult && eliminatedPlayerId && !isTie ? (
                    <div className={styles.resultCard}>
                        <div className={styles.eliminationResult}>
                            {isEliminatedPlayerSpy ? (
                                <>
                                    <div className={styles.resultIcon}>🕵️</div>
                                    <div className={styles.eliminationTitle}>Выбывает игрок</div>
                                    <div className={styles.eliminatedPlayerName}>{eliminatedPlayer?.name}</div>
                                    <div className={styles.eliminationStatus}>Он <strong>ШПИОН!</strong></div>
                                    <div className={styles.eliminationStatus} style={{ marginTop: '20px', fontSize: '16px', color: '#666' }}>
                                        Шпион может угадать локацию перед выбыванием...
                                    </div>
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
                ) : null}
                
                {/* Показываем финал только если игра закончилась и это не шпион, который должен угадать */}
                {!showVotingResult && gameEnded && !isEliminatedPlayerSpy && (
                    <div className={styles.resultCard}>
                        <div className={styles.resultIcon}>✅</div>
                        <div className={styles.resultTitle}>Игра завершена!</div>
                        <div className={styles.resultDescription}>
                            {eliminatedPlayer && (
                                <>
                                    <strong>{eliminatedPlayer.name}</strong> получил {maxVotes} {maxVotes === 1 ? 'голос' : 'голосов'} и выбыл.
                                </>
                            )}
                        </div>
                        <div className={styles.spyReveal}>
                            {spyIdsArray.length > 1 ? 'Шпионы' : 'Шпион'}: <strong>{spyPlayers.map(s => s.name).join(', ')}</strong>
                        </div>
                        <div className={styles.locationReveal}>
                            Локация была: <strong>{location}</strong>
                        </div>
                    </div>
                )}

                <div className={styles.votesSection}>
                    <h2 className={styles.sectionTitle}>Результаты голосования</h2>
                    <div className={styles.votesList}>
                        {players.map((player) => {
                            const votes = (activeVoteCounts || voteCounts)[player.id] || 0;
                            const isMostVoted = player.id === mostVotedId;
                            const isActualSpy = spyIdsArray.includes(player.id);
                            const isEliminated = player.id === eliminatedPlayerId;
                            
                            return (
                                <div
                                    key={player.id}
                                    className={`${styles.voteItem} ${isMostVoted ? styles.mostVoted : ''} ${isActualSpy ? styles.spy : ''} ${isEliminated ? styles.eliminated : ''}`}
                                >
                                    <div className={styles.playerInfo}>
                                        <div className={styles.playerAvatar}>
                                            {player.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className={styles.playerName}>
                                            {player.name}
                                            {isActualSpy && <span className={styles.spyBadge}>🕵️</span>}
                                            {isEliminated && <span className={styles.eliminatedBadge}>❌</span>}
                                        </div>
                                    </div>
                                    <div className={styles.voteCount}>
                                        {votes} {votes === 1 ? 'голос' : 'голосов'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {showVotingResult && eliminatedPlayerId && !isTie && (
                    <div className={styles.countdown}>
                        {isEliminatedPlayerSpy ? (
                            <p>Переход к угадыванию слова шпионом...</p>
                        ) : (
                            <p>Просмотр результатов голосования...</p>
                        )}
                    </div>
                )}
                {!showVotingResult && continueGame && !gameEnded && countdown !== null && (
                    <div className={styles.countdown}>
                        <p>Возврат к игре через {countdown} секунд...</p>
                    </div>
                )}

                {/* Показываем кнопки действий только если не переходим к угадыванию слова */}
                {!showVotingResult || !isEliminatedPlayerSpy ? (
                    <div className={styles.actions}>
                        {gameEnded ? (
                            <button 
                                onClick={handleBackToRoom}
                                className={styles.backButton}
                            >
                                Вернуться в комнату
                            </button>
                        ) : !isEliminatedPlayerSpy ? (
                            <button 
                                onClick={() => router.get(`/room/${roomCode}/spy/game`, { playerId })}
                                className={styles.backButton}
                            >
                                Продолжить игру
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
