import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { useSpyWebSocket } from '../hooks/useSpyWebSocket';
import { useSpyGame } from '../hooks/useSpyGame';
import styles from '../SpyVoting.module.css';

export default function SpyVoting({ roomCode, playerId, players, votes: initialVotes, eliminatedPlayers = [] }) {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [votes, setVotes] = useState(initialVotes || {});
    const [voteDetails, setVoteDetails] = useState([]);
    const [isTie, setIsTie] = useState(false);
    const { submitVote, getGameData, isLoading } = useSpyGame(roomCode, playerId);

    useEffect(() => {
        if (initialVotes && initialVotes[playerId]) {
            setHasVoted(true);
            setSelectedPlayer(initialVotes[playerId]);
        }
        
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

    // Убираем проверку статуса - на странице voting мы уже знаем, что статус = 'voting'
    // Проверка статуса здесь вызывает бесконечные перезагрузки

    // Обработка WebSocket событий
    useSpyWebSocket(roomCode, playerId, {
        onVoteSubmitted: (e) => {
            console.log('🗳️ Голос получен:', e);
            setVotes(prev => ({
                ...prev,
                [e.playerId]: e.votedForId,
            }));
            
            setVoteDetails(prev => {
                const filtered = prev.filter(v => v.voterId !== e.playerId);
                return [...filtered, {
                    voterId: e.playerId,
                    voterName: e.playerName,
                    votedForId: e.votedForId,
                    votedForName: e.votedForName,
                }];
            });
        },
        onVotingStarted: () => {
            // Обновляем данные через router.get вместо полной перезагрузки
            router.get(`/room/${roomCode}/spy/voting`, { playerId }, {
                preserveState: false,
                only: ['votes', 'players', 'eliminatedPlayers'],
            });
        },
        onGameContinue: () => {
            setIsTie(true);
            setTimeout(() => {
                router.get(`/room/${roomCode}/spy/game`, { playerId });
            }, 3000);
        },
        onResultsReady: () => {
            router.get(`/room/${roomCode}/spy/results`, { playerId });
        },
        onPlayerEliminated: () => {
            router.get('/');
        },
    });

    const handleVote = async (votedForId) => {
        if (hasVoted || votedForId === playerId) {
            return;
        }

        setSelectedPlayer(votedForId);

        try {
            await submitVote(votedForId);
            setHasVoted(true);
        } catch (error) {
            console.error('Ошибка при голосовании:', error);
            setSelectedPlayer(null);
        }
    };

    const getVoteCount = (playerId) => {
        return Object.values(votes).filter(v => v === playerId).length;
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {isTie ? (
                    <div className={styles.tieMessage}>
                        <div className={styles.tieIcon}>❌</div>
                        <h2 className={styles.tieTitle}>ГОЛОСОВАНИЕ ПРОВАЛЕНО</h2>
                        <p className={styles.tieSubtitle}>Играем новый круг вопросов</p>
                    </div>
                ) : (
                    <>
                        <div className={styles.header}>
                            <h1 className={styles.title}>🗳️ Голосование</h1>
                            <p className={styles.subtitle}>
                                Кто, по вашему мнению, является Шпионом?
                            </p>
                        </div>

                        {!hasVoted && (
                            <div className={styles.playersList}>
                                {players
                                    .filter(player => player.id !== playerId && !eliminatedPlayers.includes(player.id))
                                    .map((player) => {
                                        const voteCount = getVoteCount(player.id);
                                        return (
                                            <button
                                                key={player.id}
                                                onClick={() => handleVote(player.id)}
                                                className={`${styles.playerCard} ${selectedPlayer === player.id ? styles.selected : ''}`}
                                                disabled={isLoading}
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

                        {hasVoted && (
                            <div className={styles.votedSection}>
                                <div className={styles.votedIcon}>✓</div>
                                <p className={styles.votedText}>
                                    Вы проголосовали за <strong>{players.find(p => p.id === selectedPlayer)?.name}</strong>
                                </p>
                                {Object.keys(votes).length < players.length && (
                                    <p className={styles.waitingText}>
                                        Ожидаем остальных игроков...
                                    </p>
                                )}
                                {Object.keys(votes).length === players.length && (
                                    <p className={styles.waitingText}>
                                        Все проголосовали! Подсчитываем результаты...
                                    </p>
                                )}
                            </div>
                        )}

                        <div className={styles.votesInfo}>
                            <p>
                                Проголосовало: <strong>{Object.keys(votes).length} / {players.length}</strong>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
