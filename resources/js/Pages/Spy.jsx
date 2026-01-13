import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import styles from './Spy.module.css';

export default function Spy({ roomCode, playerId, isSpy, location, gameStatus, players: initialPlayers, readyToVote: initialReadyToVote }) {
    const [showCard, setShowCard] = useState(true);
    const [cardRevealed, setCardRevealed] = useState(false);
    const [players, setPlayers] = useState(initialPlayers || []);
    const [readyToVote, setReadyToVote] = useState(initialReadyToVote || []);
    const [hasVotedReady, setHasVotedReady] = useState((initialReadyToVote || []).includes(playerId));
    const [showRole, setShowRole] = useState(false);
    const [roleBlurred, setRoleBlurred] = useState(true);

    useEffect(() => {
        // Показываем карточку на 4 секунды
        if (showCard && !cardRevealed) {
            const timer = setTimeout(() => {
                setShowCard(false);
                setCardRevealed(true);
            }, 4000);

            return () => clearTimeout(timer);
        }
    }, [showCard, cardRevealed]);

    useEffect(() => {
        // Слушаем события WebSocket
        if (!window.Echo) {
            console.error('Echo не инициализирован');
            return;
        }

        const channel = window.Echo.channel(`room.${roomCode}`);

        channel
            .listen('.spy.game.started', () => {
                // Игра началась, перезагружаем страницу для получения новых данных
                router.reload({
                    only: ['isSpy', 'location', 'gameStatus', 'players', 'readyToVote'],
                });
                // Показываем карточку заново
                setShowCard(true);
                setCardRevealed(false);
            })
            .listen('.spy.game.continue', () => {
                // Игра продолжается, перезагружаем страницу
                router.reload({
                    only: ['isSpy', 'location', 'gameStatus', 'players', 'readyToVote'],
                });
                // Сбрасываем состояние готовности к голосованию
                setHasVotedReady(false);
                setReadyToVote([]);
            })
            .listen('.spy.ready.to.vote', (e) => {
                // Обновляем список готовых игроков
                setReadyToVote(e.readyPlayers || []);
            })
            .listen('.spy.voting.started', () => {
                // Переходим на страницу голосования
                router.get(`/room/${roomCode}/spy/voting`, {
                    playerId,
                });
            });

        return () => {
            window.Echo.leave(`room.${roomCode}`);
        };
    }, [roomCode, playerId]);

    const handleReadyToVote = () => {
        if (hasVotedReady) {
            return;
        }

        if (window.axios) {
            window.axios.post(`/room/${roomCode}/spy/ready-to-vote`, {
                playerId,
            })
                .then((response) => {
                    setHasVotedReady(true);
                    setReadyToVote(response.data.readyPlayers || []);
                })
                .catch(error => {
                    console.error('Ошибка при голосовании за начало голосования:', error);
                });
        }
    };

    const handleShowRole = () => {
        setShowRole(true);
        setRoleBlurred(false);
        
        // Через 2 секунды скрываем снова
        setTimeout(() => {
            setShowRole(false);
            setRoleBlurred(true);
        }, 2000);
    };

    const allReady = readyToVote.length === players.length && players.length > 0;

    // Показываем карточку
    if (showCard) {
        return (
            <div className={styles.cardContainer}>
                <div className={styles.card}>
                    {isSpy ? (
                        <>
                            <div className={styles.cardIcon}>🕵️</div>
                            <div className={styles.cardTitle}>Вы - Шпион!</div>
                            <div className={styles.cardDescription}>
                                Вы не знаете локацию.<br/>
                                Попытайтесь угадать её или не выдать себя!
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={styles.cardIcon}>📍</div>
                            <div className={styles.cardTitle}>Локация</div>
                            <div className={styles.cardLocation}>{location}</div>
                            <div className={styles.cardDescription}>
                                Задавайте вопросы о локации,<br/>
                                но не называйте её напрямую!
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Основной экран игры
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>🕵️ Шпион</h1>
                </div>

                <div 
                    className={`${styles.gameInfo} ${roleBlurred ? styles.blurred : ''}`}
                    onClick={handleShowRole}
                    style={{ cursor: roleBlurred ? 'pointer' : 'default' }}
                >
                    {isSpy ? (
                        <div className={styles.spyInfo}>
                            <div className={styles.infoIcon}>🕵️</div>
                            <div className={styles.infoText}>
                                {showRole ? (
                                    <>
                                        <strong>Вы - Шпион!</strong><br/>
                                        Попытайтесь угадать локацию или не выдать себя
                                    </>
                                ) : (
                                    <>
                                        <strong>Нажмите, чтобы увидеть роль</strong><br/>
                                        <span style={{ fontSize: '14px', color: '#999' }}>Кликните для просмотра</span>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className={styles.locationInfo}>
                            <div className={styles.infoIcon}>📍</div>
                            <div className={styles.infoText}>
                                {showRole ? (
                                    <>
                                        <strong>Ваша локация:</strong><br/>
                                        <span className={styles.locationName}>{location}</span>
                                    </>
                                ) : (
                                    <>
                                        <strong>Нажмите, чтобы увидеть локацию</strong><br/>
                                        <span style={{ fontSize: '14px', color: '#999' }}>Кликните для просмотра</span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

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
                        disabled={hasVotedReady || allReady}
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
