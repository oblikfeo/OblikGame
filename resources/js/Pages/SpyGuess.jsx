import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import styles from './SpyGuess.module.css';

export default function SpyGuess({ roomCode, playerId, eliminatedPlayerId, players, location, spyIds }) {
    const [guessedWord, setGuessedWord] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [isEliminatedPlayer, setIsEliminatedPlayer] = useState(playerId === eliminatedPlayerId);
    const [votes, setVotes] = useState({});
    const [hasVoted, setHasVoted] = useState(false);
    const [allVoted, setAllVoted] = useState(false);
    const [result, setResult] = useState(null);
    
    const eliminatedPlayer = players.find(p => p.id === eliminatedPlayerId);
    const spyIdsArray = spyIds || [];
    const isEliminatedPlayerSpy = eliminatedPlayerId && spyIdsArray.includes(eliminatedPlayerId);
    
    // Активные игроки для голосования (все кроме выбывшего шпиона, но включая его для отображения)
    const votingPlayers = players.filter(p => p.id !== eliminatedPlayerId);

    useEffect(() => {
        // Проверяем, есть ли уже угаданное слово
        if (window.axios) {
            window.axios.get(`/room/${roomCode}/spy/guess-status`, {
                params: { playerId }
            })
                .then(response => {
                    if (response.data.guessedWord) {
                        setGuessedWord(response.data.guessedWord);
                        setHasSubmitted(true);
                    }
                    if (response.data.votes) {
                        setVotes(response.data.votes);
                    }
                    if (response.data.allVoted) {
                        setAllVoted(true);
                        if (response.data.result) {
                            setResult(response.data.result);
                        }
                    }
                })
                .catch(error => {
                    console.error('Ошибка при получении статуса угадывания:', error);
                });
        }
    }, [roomCode, playerId]);

    useEffect(() => {
        // Слушаем события WebSocket
        if (!window.Echo) {
            return;
        }

        const channel = window.Echo.channel(`room.${roomCode}`);

        channel
            .listen('.spy.guess.submitted', (e) => {
                // Шпион назвал слово
                setGuessedWord(e.guessedWord);
                setHasSubmitted(true);
            })
            .listen('.spy.guess.vote.submitted', (e) => {
                // Игрок проголосовал
                setVotes(prev => ({
                    ...prev,
                    [e.playerId]: e.vote
                }));
            })
            .listen('.spy.guess.result', (e) => {
                // Результат угадывания
                setAllVoted(true);
                setResult(e.result);
            })
            .listen('.spy.game.continue', () => {
                // Игра продолжается (шпион не угадал, но еще есть шпионы)
                setTimeout(() => {
                    router.get(`/room/${roomCode}/spy/game`, {
                        playerId,
                    });
                }, 3000);
            })
            .listen('.player.eliminated', (e) => {
                // Игрок исключен (но выбывший шпион может остаться для угадывания)
                // Если это не выбывший шпион, перенаправляем на главный экран
                if (e.playerId === playerId && playerId !== eliminatedPlayerId) {
                    alert('Вы были исключены из игры');
                    router.get('/');
                }
            });

        return () => {
            window.Echo.leave(`room.${roomCode}`);
        };
    }, [roomCode, playerId]);

    const handleSubmitGuess = () => {
        if (!guessedWord.trim() || hasSubmitted) {
            return;
        }

        if (window.axios) {
            window.axios.post(`/room/${roomCode}/spy/submit-guess`, {
                playerId,
                guessedWord: guessedWord.trim()
            })
                .then(() => {
                    setHasSubmitted(true);
                })
                .catch(error => {
                    console.error('Ошибка при отправке угадывания:', error);
                });
        }
    };

    const handleVote = (vote) => {
        if (hasVoted || isEliminatedPlayer) {
            return;
        }

        if (window.axios) {
            window.axios.post(`/room/${roomCode}/spy/vote-guess`, {
                playerId,
                vote
            })
                .then(() => {
                    setHasVoted(true);
                })
                .catch(error => {
                    console.error('Ошибка при голосовании:', error);
                });
        }
    };

    // Если не шпион выбыл, просто показываем сообщение и возвращаемся к игре
    if (!isEliminatedPlayerSpy) {
        return (
            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.message}>
                        <div className={styles.messageIcon}>❌</div>
                        <div className={styles.messageTitle}>Выбывает игрок</div>
                        <div className={styles.messagePlayerName}>{eliminatedPlayer?.name}</div>
                        <div className={styles.messageStatus}>Он не был шпионом</div>
                        <p className={styles.messageText}>Игра продолжается...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Если это выбывший шпион - показываем форму для угадывания слова
    if (isEliminatedPlayer) {
        return (
            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>🕵️ Вы - Шпион!</h1>
                        <p className={styles.subtitle}>У вас есть последний шанс угадать локацию</p>
                    </div>

                    {!hasSubmitted ? (
                        <div className={styles.guessSection}>
                            <label className={styles.label}>
                                Назовите локацию, которую вы угадали:
                            </label>
                            <input
                                type="text"
                                value={guessedWord}
                                onChange={(e) => setGuessedWord(e.target.value)}
                                placeholder="Введите название локации..."
                                className={styles.input}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSubmitGuess();
                                    }
                                }}
                            />
                            <button
                                onClick={handleSubmitGuess}
                                className={styles.submitButton}
                                disabled={!guessedWord.trim()}
                            >
                                Назвать локацию
                            </button>
                        </div>
                    ) : (
                        <div className={styles.waitingSection}>
                            <div className={styles.waitingIcon}>⏳</div>
                            <p className={styles.waitingText}>
                                Вы назвали: <strong>{guessedWord}</strong>
                            </p>
                            <p className={styles.waitingText}>
                                Ожидаем голосования игроков...
                            </p>
                        </div>
                    )}

                {allVoted && result && (
                    <div className={styles.resultSection}>
                        {result.spiesWin ? (
                            <>
                                <div className={styles.resultIcon}>🎉</div>
                                <div className={styles.resultTitle}>Шпионы выиграли!</div>
                                <div className={styles.resultText}>
                                    Игроки подтвердили, что вы угадали локацию: <strong>{location}</strong>
                                </div>
                                <div className={styles.resultText} style={{ marginTop: '15px', fontSize: '14px', color: '#999' }}>
                                    Игра завершена. Все шпионы выиграли!
                                </div>
                                <button
                                    onClick={() => router.get(`/room/${roomCode}`, { playerId })}
                                    className={styles.submitButton}
                                    style={{ marginTop: '20px' }}
                                >
                                    Вернуться в комнату
                                </button>
                            </>
                        ) : (
                            <>
                                <div className={styles.resultIcon}>❌</div>
                                <div className={styles.resultTitle}>Шпионы не угадали</div>
                                <div className={styles.resultText}>
                                    Игроки не подтвердили ваше угадывание. Локация была: <strong>{location}</strong>
                                </div>
                                <div className={styles.resultText} style={{ marginTop: '15px', fontSize: '14px', color: '#999' }}>
                                    Игра завершена. Игроки победили!
                                </div>
                                <button
                                    onClick={() => router.get(`/room/${roomCode}`, { playerId })}
                                    className={styles.submitButton}
                                    style={{ marginTop: '20px' }}
                                >
                                    Вернуться в комнату
                                </button>
                            </>
                        )}
                    </div>
                )}
                </div>
            </div>
        );
    }

    // Если это обычный игрок - показываем голосование
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>🗳️ Голосование</h1>
                    <p className={styles.subtitle}>
                        {eliminatedPlayer?.name} назвал локацию: <strong>{guessedWord || '...'}</strong>
                    </p>
                </div>

                {!guessedWord ? (
                    <div className={styles.waitingSection}>
                        <div className={styles.waitingIcon}>⏳</div>
                        <p className={styles.waitingText}>
                            Ожидаем, когда {eliminatedPlayer?.name} назовет локацию...
                        </p>
                    </div>
                ) : !hasVoted ? (
                    <div className={styles.votingSection}>
                        <p className={styles.votingQuestion}>
                            Это правильная локация?
                        </p>
                        <div className={styles.votingButtons}>
                            <button
                                onClick={() => handleVote('yes')}
                                className={`${styles.voteButton} ${styles.yesButton}`}
                            >
                                ✅ ДА
                            </button>
                            <button
                                onClick={() => handleVote('no')}
                                className={`${styles.voteButton} ${styles.noButton}`}
                            >
                                ❌ НЕТ
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.waitingSection}>
                        <div className={styles.waitingIcon}>✓</div>
                        <p className={styles.waitingText}>
                            Вы проголосовали: <strong>{votes[playerId] === 'yes' ? 'ДА' : 'НЕТ'}</strong>
                        </p>
                                <p className={styles.waitingText}>
                                    Ожидаем остальных игроков... ({Object.keys(votes).length} / {votingPlayers.length})
                                </p>
                    </div>
                )}

                {allVoted && result && (
                    <div className={styles.resultSection}>
                        {result.spiesWin ? (
                            <>
                                <div className={styles.resultIcon}>🎉</div>
                                <div className={styles.resultTitle}>Шпионы выиграли!</div>
                                <div className={styles.resultText}>
                                    Большинство игроков подтвердило угадывание. Локация была: <strong>{location}</strong>
                                </div>
                                <div className={styles.resultText} style={{ marginTop: '15px', fontSize: '14px', color: '#999' }}>
                                    Игра завершена. Все шпионы выиграли!
                                </div>
                                <button
                                    onClick={() => router.get(`/room/${roomCode}`, { playerId })}
                                    className={styles.submitButton}
                                    style={{ marginTop: '20px' }}
                                >
                                    Вернуться в комнату
                                </button>
                            </>
                        ) : (
                            <>
                                <div className={styles.resultIcon}>✅</div>
                                <div className={styles.resultTitle}>
                                    {result.allSpiesEliminated ? 'Игроки выиграли!' : 'Игроки выиграли раунд!'}
                                </div>
                                <div className={styles.resultText}>
                                    Шпион не угадал локацию. Локация была: <strong>{location}</strong>
                                </div>
                                <div className={styles.resultText} style={{ marginTop: '15px', fontSize: '14px', color: '#999' }}>
                                    {result.allSpiesEliminated 
                                        ? 'Игра завершена. Все шпионы выбыли!' 
                                        : 'Игра продолжается...'}
                                </div>
                                {result.allSpiesEliminated ? (
                                    <button
                                        onClick={() => router.get(`/room/${roomCode}`, { playerId })}
                                        className={styles.submitButton}
                                        style={{ marginTop: '20px' }}
                                    >
                                        Вернуться в комнату
                                    </button>
                                ) : null}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
