import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import styles from './SpyVoting.module.css';

export default function SpyVoting({ roomCode, playerId, players, votes: initialVotes, eliminatedPlayers = [] }) {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [votes, setVotes] = useState(initialVotes || {});
    const [voteDetails, setVoteDetails] = useState([]); // Массив объектов {voterId, voterName, votedForId, votedForName}

    useEffect(() => {
        // Проверяем, проголосовал ли уже игрок
        if (initialVotes && initialVotes[playerId]) {
            setHasVoted(true);
            setSelectedPlayer(initialVotes[playerId]);
        }
        
        // Инициализируем детали голосов из начальных данных
        const initialDetails = [];
        Object.keys(initialVotes || {}).forEach(voterId => {
            const voter = players.find(p => p.id === voterId);
            const votedFor = players.find(p => p.id === initialVotes[voterId]);
            if (voter && votedFor) {
                initialDetails.push({
                    voterId,
                    voterName: voter.name,
                    votedForId: initialVotes[voterId],
                    votedForName: votedFor.name,
                });
            }
        });
        setVoteDetails(initialDetails);
    }, [playerId, initialVotes, players]);

    useEffect(() => {
        // Слушаем события WebSocket
        if (!window.Echo) {
            return;
        }

        const channel = window.Echo.channel(`room.${roomCode}`);

        channel
            .listen('.spy.vote.submitted', (e) => {
                // Обновляем список голосов
                setVotes(prev => ({
                    ...prev,
                    [e.playerId]: e.votedForId,
                }));
                
                // Добавляем детали голоса
                setVoteDetails(prev => {
                    // Удаляем старый голос этого игрока, если есть
                    const filtered = prev.filter(v => v.voterId !== e.playerId);
                    // Добавляем новый голос
                    return [...filtered, {
                        voterId: e.playerId,
                        voterName: e.playerName,
                        votedForId: e.votedForId,
                        votedForName: e.votedForName,
                    }];
                });
            })
            .listen('.spy.voting.started', () => {
                // Новый раунд голосования начался
                router.reload();
            })
            .listen('.spy.results.ready', () => {
                // Переходим на страницу результатов
                router.get(`/room/${roomCode}/spy/results`, {
                    playerId,
                });
            });

        return () => {
            window.Echo.leave(`room.${roomCode}`);
        };
    }, [roomCode, playerId]);

    const handleVote = (votedForId) => {
        if (hasVoted || votedForId === playerId) {
            return; // Нельзя голосовать дважды или за себя
        }

        setSelectedPlayer(votedForId);

        if (window.axios) {
            window.axios.post(`/room/${roomCode}/spy/vote`, {
                playerId,
                votedForId,
            })
                .then(() => {
                    setHasVoted(true);
                })
                .catch(error => {
                    console.error('Ошибка при голосовании:', error);
                    setSelectedPlayer(null);
                });
        }
    };

    const getVoteCount = (playerId) => {
        return Object.values(votes).filter(v => v === playerId).length;
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>🗳️ Голосование</h1>
                    <p className={styles.subtitle}>
                        Кто, по вашему мнению, является Шпионом?
                    </p>
                </div>

                {/* Список игроков для голосования */}
                {!hasVoted && (
                    <div className={styles.playersList}>
                        {players
                            .filter(player => player.id !== playerId && !eliminatedPlayers.includes(player.id)) // Исключаем себя и исключенных
                            .map((player) => {
                                const voteCount = getVoteCount(player.id);
                                return (
                                    <button
                                        key={player.id}
                                        onClick={() => handleVote(player.id)}
                                        className={`${styles.playerCard} ${selectedPlayer === player.id ? styles.selected : ''}`}
                                    >
                                        <div className={styles.playerAvatar}>
                                            {player.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className={styles.playerInfo}>
                                            <div className={styles.playerName}>{player.name}</div>
                                            {voteCount > 0 && (
                                                <div className={styles.voteCount}>
                                                    {voteCount} {voteCount === 1 ? 'голос' : 'голосов'}
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.voteButton}>→</div>
                                    </button>
                                );
                            })}
                    </div>
                )}

                {/* Сообщение после голосования */}
                {hasVoted && (
                    <div className={styles.votedSection}>
                        <div className={styles.votedIcon}>✓</div>
                        <p className={styles.votedText}>
                            Вы проголосовали за <strong>{players.find(p => p.id === selectedPlayer)?.name}</strong>
                        </p>
                        <p className={styles.waitingText}>
                            Ожидаем остальных игроков...
                        </p>
                    </div>
                )}

                {/* Результаты голосования в реальном времени */}
                <div className={styles.liveResults}>
                    <h2 className={styles.resultsTitle}>📊 Результаты голосования</h2>
                    <div className={styles.resultsList}>
                        {(() => {
                            // Вычисляем максимальное количество голосов для нормализации
                            const allVoteCounts = players
                                .filter(p => p.id !== playerId && !eliminatedPlayers.includes(p.id))
                                .map(p => getVoteCount(p.id));
                            const maxVotes = allVoteCounts.length > 0 ? Math.max(...allVoteCounts, 1) : 1;
                            
                            return players
                                .filter(player => player.id !== playerId && !eliminatedPlayers.includes(player.id))
                                .sort((a, b) => getVoteCount(b.id) - getVoteCount(a.id)) // Сортируем по убыванию голосов
                                .map((player) => {
                                    const voteCount = getVoteCount(player.id);
                                    const percentage = (voteCount / maxVotes) * 100;
                                    
                                    return (
                                        <div 
                                            key={player.id}
                                            className={styles.resultCard}
                                        >
                                            <div className={styles.resultPlayerInfo}>
                                                <div className={styles.resultPlayerAvatar}>
                                                    {player.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className={styles.resultPlayerName}>{player.name}</div>
                                                <div className={styles.resultVoteCount}>
                                                    {voteCount} {voteCount === 1 ? 'голос' : 'голосов'}
                                                </div>
                                            </div>
                                            <div className={styles.progressBarContainer}>
                                                <div 
                                                    className={styles.progressBar}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                });
                        })()}
                    </div>
                </div>

                <div className={styles.votesInfo}>
                    <p>
                        Проголосовало: <strong>{Object.keys(votes).length} / {players.length}</strong>
                    </p>
                </div>
            </div>
        </div>
    );
}
