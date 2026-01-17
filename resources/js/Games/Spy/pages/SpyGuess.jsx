import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { useSpyWebSocket } from '../hooks/useSpyWebSocket';
import { useSpyGame } from '../hooks/useSpyGame';
import styles from '../SpyGuess.module.css';

export default function SpyGuess({ roomCode, playerId, eliminatedPlayerId, players, location, spyIds }) {
    const [guessedWord, setGuessedWord] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [isEliminatedPlayer, setIsEliminatedPlayer] = useState(playerId === eliminatedPlayerId);
    const [votes, setVotes] = useState({});
    const [hasVoted, setHasVoted] = useState(false);
    const [allVoted, setAllVoted] = useState(false);
    const [result, setResult] = useState(null);
    const [locationOptions, setLocationOptions] = useState([]);
    
    const eliminatedPlayer = players.find(p => p.id === eliminatedPlayerId);
    const spyIdsArray = spyIds || [];
    const isEliminatedPlayerSpy = eliminatedPlayerId && spyIdsArray.includes(eliminatedPlayerId);
    const votingPlayers = players.filter(p => p.id !== eliminatedPlayerId);
    const { submitGuess, voteGuess, getGuessStatus, getGuessOptions, isLoading } = useSpyGame(roomCode, playerId);

    useEffect(() => {
        const loadStatus = async () => {
            try {
                const status = await getGuessStatus();
                if (status?.guessedWord) {
                    setGuessedWord(status.guessedWord);
                    setHasSubmitted(true);
                }
                if (status?.votes) {
                    setVotes(status.votes);
                }
                if (status?.allVoted) {
                    setAllVoted(true);
                    if (status.result) {
                        setResult(status.result);
                    }
                }
            } catch (error) {
                console.error('Ошибка при получении статуса угадывания:', error);
            }
        };
        loadStatus();

        // Загружаем опции локаций для выбора (только для выбывшего шпиона)
        if (isEliminatedPlayer && !hasSubmitted) {
            const loadOptions = async () => {
                try {
                    const optionsData = await getGuessOptions();
                    if (optionsData?.options) {
                        setLocationOptions(optionsData.options);
                    }
                } catch (error) {
                    console.error('Ошибка при получении опций локаций:', error);
                }
            };
            loadOptions();
        }
    }, [roomCode, playerId, getGuessStatus, getGuessOptions, isEliminatedPlayer, hasSubmitted]);

    useSpyWebSocket(roomCode, playerId, {
        onGuessSubmitted: (e) => {
            setGuessedWord(e.guessedWord);
            setHasSubmitted(true);
        },
        onGuessVoteSubmitted: (e) => {
            setVotes(prev => ({
                ...prev,
                [e.playerId]: e.vote
            }));
        },
        onGuessResult: (e) => {
            setAllVoted(true);
            setResult(e.result);
        },
        onGameContinue: () => {
            setTimeout(() => {
                router.get(`/room/${roomCode}/spy/game`, { playerId });
            }, 3000);
        },
        onPlayerEliminated: (e) => {
            if (e.playerId === playerId && playerId !== eliminatedPlayerId) {
                router.get('/');
            }
        },
    });

    const handleSubmitGuess = async (selectedLocation = null) => {
        const locationToSubmit = selectedLocation || guessedWord;
        if (!locationToSubmit.trim() || hasSubmitted) {
            return;
        }

        try {
            await submitGuess(locationToSubmit.trim());
            setGuessedWord(locationToSubmit.trim());
            setHasSubmitted(true);
        } catch (error) {
            console.error('Ошибка при отправке угадывания:', error);
        }
    };

    const handleVote = async (vote) => {
        if (hasVoted || isEliminatedPlayer) {
            return;
        }

        try {
            await voteGuess(vote);
            setHasVoted(true);
        } catch (error) {
            console.error('Ошибка при голосовании:', error);
        }
    };

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
                                Выберите локацию, которую вы угадали:
                            </label>
                            {locationOptions.length > 0 ? (
                                <div className={styles.optionsList}>
                                    {locationOptions.map((option, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSubmitGuess(option)}
                                            className={`${styles.optionButton} ${guessedWord === option ? styles.selected : ''}`}
                                            disabled={isLoading}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.loadingOptions}>
                                    Загрузка опций...
                                </div>
                            )}
                        </div>
                    ) : (
                    <div className={styles.waitingSection}>
                        <div className={styles.waitingIcon}>⏳</div>
                        <p className={styles.waitingText}>
                            Вы угадали: <strong>{guessedWord}</strong>
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

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>🗳️ Голосование</h1>
                    <p className={styles.subtitle}>
                        {eliminatedPlayer?.name} угадал локацию: <strong>{guessedWord || '...'}</strong>
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
                                disabled={isLoading}
                            >
                                ✅ ДА
                            </button>
                            <button
                                onClick={() => handleVote('no')}
                                className={`${styles.voteButton} ${styles.noButton}`}
                                disabled={isLoading}
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
