import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import styles from './SpyResults.module.css';

export default function SpyResults({ roomCode, playerId, results, players }) {
    const { voteCounts, activeVoteCounts, mostVotedId, maxVotes, isSpy, location, spyIds, spyId, eliminatedPlayerId, isTie, gameEnded, continueGame } = results;
    const [countdown, setCountdown] = useState(continueGame && !gameEnded ? 5 : null);
    
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
            });

        return () => {
            window.Echo.leave(`room.${roomCode}`);
        };
    }, [roomCode, playerId]);

    // Таймер обратного отсчета для автоматического возврата к игре
    useEffect(() => {
        if (continueGame && !gameEnded && countdown !== null) {
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
    }, [continueGame, gameEnded, countdown, roomCode, playerId]);

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

                <div className={styles.resultCard}>
                    {isEliminatedPlayerSpy ? (
                        <>
                            <div className={styles.resultIcon}>✅</div>
                            <div className={styles.resultTitle}>Шпион пойман!</div>
                            <div className={styles.resultDescription}>
                                <strong>{eliminatedPlayer?.name}</strong> {spyIdsArray.length > 1 ? 'был одним из Шпионов' : 'был Шпионом'} и получил {maxVotes} {maxVotes === 1 ? 'голос' : 'голосов'}
                            </div>
                            {spyIdsArray.length > 1 && (
                                <div className={styles.spyReveal}>
                                    Все Шпионы: <strong>{spyPlayers.map(s => s.name).join(', ')}</strong>
                                </div>
                            )}
                            <div className={styles.locationReveal}>
                                Локация была: <strong>{location}</strong>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={styles.resultIcon}>❌</div>
                            <div className={styles.resultTitle}>Шпион не пойман!</div>
                            <div className={styles.resultDescription}>
                                <strong>{eliminatedPlayer?.name}</strong> получил {maxVotes} {maxVotes === 1 ? 'голос' : 'голосов'} и выбыл, но {spyIdsArray.length > 1 ? 'он не был Шпионом' : 'он не был Шпионом'}
                            </div>
                            <div className={styles.spyReveal}>
                                {spyIdsArray.length > 1 ? 'Настоящие Шпионы' : 'Настоящий Шпион'}: <strong>{spyPlayers.map(s => s.name).join(', ')}</strong>
                            </div>
                            <div className={styles.locationReveal}>
                                Локация была: <strong>{location}</strong>
                            </div>
                        </>
                    )}
                </div>

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

                {continueGame && !gameEnded && countdown !== null && (
                    <div className={styles.countdown}>
                        <p>Возврат к игре через {countdown} секунд...</p>
                    </div>
                )}

                <div className={styles.actions}>
                    {gameEnded ? (
                        <button 
                            onClick={handleBackToRoom}
                            className={styles.backButton}
                        >
                            Вернуться в комнату
                        </button>
                    ) : (
                        <button 
                            onClick={() => router.get(`/room/${roomCode}/spy/game`, { playerId })}
                            className={styles.backButton}
                        >
                            Продолжить игру
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
