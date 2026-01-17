import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { useSpyWebSocket } from '../hooks/useSpyWebSocket';
import { useSpyGame } from '../hooks/useSpyGame';
import LocationCard from '../components/LocationCard';
import styles from '../Spy.module.css';

export default function SpyGame({ roomCode, playerId, isSpy, location, gameStatus, players: initialPlayers, readyToVote: initialReadyToVote }) {
    const [players, setPlayers] = useState(initialPlayers || []);
    const [readyToVote, setReadyToVote] = useState(initialReadyToVote || []);
    const [hasVotedReady, setHasVotedReady] = useState((initialReadyToVote || []).includes(playerId));
    const [showRole, setShowRole] = useState(false);
    const [roleBlurred, setRoleBlurred] = useState(true);
    const { readyToVote: readyToVoteAPI, getGameData, isLoading } = useSpyGame(roomCode, playerId);

    // Обработка WebSocket событий
    useSpyWebSocket(roomCode, playerId, {
        onGameStarted: (e) => {
            // Обновляем состояние напрямую из события
            if (e.isSpy !== undefined) {
                // Обновляем через router.get для получения актуальных данных
                router.get(`/room/${roomCode}/spy/game`, { playerId }, {
                    preserveState: false,
                    only: ['isSpy', 'location', 'gameStatus', 'players', 'readyToVote'],
                });
            }
        },
        onGameContinue: (e) => {
            // Обновляем состояние напрямую
            setHasVotedReady(false);
            setReadyToVote([]);
            // Обновляем данные через router.get
            router.get(`/room/${roomCode}/spy/game`, { playerId }, {
                preserveState: false,
                only: ['isSpy', 'location', 'gameStatus', 'players', 'readyToVote'],
            });
        },
        onReadyToVote: (e) => {
            setReadyToVote(e.readyPlayers || []);
        },
        onVotingStarted: () => {
            router.get(`/room/${roomCode}/spy/voting`, { playerId });
        },
        onPlayerEliminated: () => {
            router.get('/');
        },
    });

    useEffect(() => {
        setPlayers(initialPlayers || []);
        setReadyToVote(initialReadyToVote || []);
        setHasVotedReady((initialReadyToVote || []).includes(playerId));

        // Убираем проверку статуса - на странице game мы уже знаем, что статус = 'playing'
        // Проверка статуса здесь вызывает бесконечные перезагрузки
    }, [initialPlayers, initialReadyToVote, playerId]);

    const handleReadyToVote = async () => {
        if (hasVotedReady) {
            return;
        }

        try {
            const response = await readyToVoteAPI();
            setHasVotedReady(true);
            setReadyToVote(response?.readyPlayers || []);
        } catch (error) {
            console.error('Ошибка при голосовании за начало голосования:', error);
        }
    };

    const handleShowRole = () => {
        setShowRole(true);
        setRoleBlurred(false);
        
        setTimeout(() => {
            setShowRole(false);
            setRoleBlurred(true);
        }, 2000);
    };

    const allReady = readyToVote.length === players.length && players.length > 0;

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>🕵️ Шпион</h1>
                </div>

                <LocationCard
                    isSpy={isSpy}
                    location={location}
                    showRole={showRole}
                    onShowRole={handleShowRole}
                    blurred={roleBlurred}
                />

                <div className={styles.playersSection}>
                    <h2 className={styles.playersTitle}>
                        Игроки ({players.length})
                        {readyToVote.length > 0 && (
                            <span className={styles.readyCount}>
                                {' '}— Готовы: {readyToVote.length}/{players.length}
                            </span>
                        )}
                    </h2>
                    <div className={styles.playersList}>
                        {players.map((player) => {
                            const isReady = readyToVote.includes(player.id);
                            return (
                                <div 
                                    key={player.id} 
                                    className={`${styles.playerCard} ${isReady ? styles.ready : ''}`}
                                >
                                    <div className={styles.playerAvatar}>
                                        {player.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className={styles.playerName}>{player.name}</div>
                                    {isReady && (
                                        <div className={styles.readyIndicator}>✓</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={styles.instructions}>
                    <p>
                        Задавайте друг другу вопросы о локации.<br/>
                        <strong>Не называйте локацию напрямую!</strong>
                    </p>
                </div>

                <div className={styles.actions}>
                    <button 
                        onClick={handleReadyToVote}
                        className={`${styles.votingButton} ${hasVotedReady ? styles.voted : ''}`}
                        disabled={hasVotedReady || allReady || isLoading}
                    >
                        {hasVotedReady 
                            ? '✓ Готов к голосованию' 
                            : allReady 
                                ? 'Ожидание начала...' 
                                : 'Начать голосование'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
