import { useEffect, useState, useRef, useCallback } from 'react';
import { router } from '@inertiajs/react';
import styles from '../CrocodileGame.module.css';

// Константы для слотов
const ALL_WORDS = [
    'Кот', 'Собака', 'Слон', 'Лев', 'Тигр', 'Медведь', 'Заяц', 'Волк',
    'Дом', 'Школа', 'Больница', 'Магазин', 'Парк', 'Море', 'Гора', 'Река',
    'Книга', 'Телефон', 'Компьютер', 'Стол', 'Стул', 'Окно', 'Дверь',
    'Яблоко', 'Банан', 'Мяч', 'Кукла', 'Машинка', 'Самолет', 'Кораблик'
];
const ACTIONS = ['рассказать', 'показать'];

export default function CrocodileGame({ roomCode, gameData: initialGameData }) {
    // Убеждаемся, что currentPlayerIndex = 0 для первого игрока при первой загрузке
    const normalizedInitialGameData = initialGameData ? (() => {
        // Если игра только что началась (нет currentWord и currentAction), currentPlayerIndex должен быть 0
        if (initialGameData.status === 'playing' && !initialGameData.currentWord && !initialGameData.currentAction) {
            console.log('Нормализация initialGameData: исправление currentPlayerIndex с', initialGameData.currentPlayerIndex, 'на 0');
            return {
                ...initialGameData,
                currentPlayerIndex: 0,
                currentPlayerId: initialGameData.players?.[0]?.id
            };
        }
        return {
            ...initialGameData,
            currentPlayerIndex: initialGameData.currentPlayerIndex ?? 0,
            currentPlayerId: initialGameData.currentPlayerId ?? initialGameData.players?.[0]?.id
        };
    })() : null;
    const [gameData, setGameData] = useState(normalizedInitialGameData);
    const [currentWord, setCurrentWord] = useState(null);
    const [currentAction, setCurrentAction] = useState(null);
    const [preparationTime, setPreparationTime] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);

    // Состояния для слайдера
    const [sliderPosition, setSliderPosition] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef(null);
    const sliderTrackRef = useRef(null);
    const startXRef = useRef(0);
    const startPositionRef = useRef(0);
    const isDraggingRef = useRef(false);
    const sliderPositionRef = useRef(0);

    // Состояния для анимации слотов
    const [showSlotAnimation, setShowSlotAnimation] = useState(false);
    const [slotWords, setSlotWords] = useState([]);
    const [slotActions, setSlotActions] = useState([]);
    const [selectedWord, setSelectedWord] = useState(null);
    const [selectedAction, setSelectedAction] = useState(null);
    const slotIntervalRef = useRef(null);

    // Синхронизируем sliderPositionRef с sliderPosition
    useEffect(() => {
        sliderPositionRef.current = sliderPosition;
    }, [sliderPosition]);

    useEffect(() => {
        if (!gameData) return;

        // Не делаем запрос при первой загрузке, если initialGameData передан
        // Запрос будет сделан только при событиях WebSocket

        // Слушаем события через WebSocket
        if (!window.Echo) {
            return;
        }

        const channel = window.Echo.channel(`room.${roomCode}`);

        channel
            .listen('.crocodile.game.started', (e) => {
                // При первом запуске игры currentPlayerIndex должен быть 0 (первый игрок)
                // Не перезаписываем gameData, если он уже установлен и currentPlayerIndex = 0
                // Это предотвращает изменение currentPlayerIndex после начала игры
                // Первый игрок (хост) всегда должен быть с currentPlayerIndex = 0
                if (!gameData) {
                    // При первой загрузке устанавливаем данные игры
                    // Убеждаемся, что currentPlayerIndex = 0 для первого игрока
                    const gameDataToSet = {
                        ...e.gameData,
                        currentPlayerIndex: e.gameData?.currentPlayerIndex ?? 0,
                        currentPlayerId: e.gameData?.currentPlayerId ?? e.gameData?.players?.[0]?.id
                    };
                    setGameData(gameDataToSet);
                } else if (gameData.currentPlayerIndex === 0 && e.gameData?.currentPlayerIndex === 0) {
                    // Если оба имеют currentPlayerIndex = 0, обновляем только если нужно
                    // Но сохраняем текущий currentPlayerIndex
                    setGameData(prev => ({
                        ...e.gameData,
                        currentPlayerIndex: prev.currentPlayerIndex,
                        currentPlayerId: prev.currentPlayerId
                    }));
                } else {
                    // В других случаях обновляем данные игры
                    // Убеждаемся, что currentPlayerIndex правильный
                    const gameDataToSet = {
                        ...e.gameData,
                        currentPlayerIndex: e.gameData?.currentPlayerIndex ?? 0,
                        currentPlayerId: e.gameData?.currentPlayerId ?? e.gameData?.players?.[0]?.id
                    };
                    setGameData(gameDataToSet);
                }
            })
            .listen('.crocodile.word.generated', (e) => {
                if (e.isNextPlayer) {
                    // Переход к следующему игроку - сбрасываем все состояния
                    setCurrentWord(null);
                    setCurrentAction(null);
                    setPreparationTime(null);
                    setTimeLeft(null);
                    setShowSlotAnimation(false);
                    setSliderPosition(0);
                    sliderPositionRef.current = 0;
                    setIsDragging(false);
                    isDraggingRef.current = false;
                    // Обновляем данные игры
                    if (window.axios) {
                        window.axios.get(`/room/${roomCode}/crocodile/game-data`)
                            .then(response => {
                                setGameData(response.data);
                            });
                    }
                }
            });

        return () => {
            window.Echo.leave(`room.${roomCode}`);
        };
    }, [roomCode]);

    // Генерация случайных слов и действий для слотов
    const generateSlotData = () => {
        const words = [];
        const actionList = [];
        for (let i = 0; i < 20; i++) {
            words.push(ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)]);
            actionList.push(ACTIONS[Math.floor(Math.random() * ACTIONS.length)]);
        }

        setSlotWords(words);
        setSlotActions(actionList);
    };

    // Запуск анимации слотов
    const startSlotAnimation = useCallback(() => {
        setShowSlotAnimation(true);
        generateSlotData();

        // Обновляем слоты каждые 150мс для быстрой анимации
        slotIntervalRef.current = setInterval(() => {
            setSlotWords(prev => {
                const newWords = [...prev];
                // Сдвигаем все слова вверх и добавляем новое вниз
                for (let i = 0; i < newWords.length - 1; i++) {
                    newWords[i] = newWords[i + 1];
                }
                newWords[newWords.length - 1] = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)];
                return newWords;
            });
            setSlotActions(prev => {
                const newActions = [...prev];
                // Сдвигаем все действия вверх и добавляем новое вниз
                for (let i = 0; i < newActions.length - 1; i++) {
                    newActions[i] = newActions[i + 1];
                }
                newActions[newActions.length - 1] = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
                return newActions;
            });
        }, 150); // Меняем каждые 150мс для быстрой анимации

        // Останавливаем через 3 секунды
        setTimeout(() => {
            if (slotIntervalRef.current) {
                clearInterval(slotIntervalRef.current);
            }
            // Генерируем финальное слово и действие
            generateFinalWord();
        }, 3000);
    }, []);

    const generateFinalWord = () => {
        const currentPlayer = gameData.players[gameData.currentPlayerIndex];

        if (window.axios) {
            window.axios.post(`/room/${roomCode}/crocodile/confirm-player`, {
                playerName: currentPlayer.name,
            })
                .then(response => {
                    setSelectedWord(response.data.word);
                    setSelectedAction(response.data.action);
                    setCurrentWord(response.data.word);
                    setCurrentAction(response.data.action);

                    // Через небольшую задержку скрываем анимацию и показываем результат
                    setTimeout(() => {
                        setShowSlotAnimation(false);
                        startPreparationTimer();
                    }, 500);
                })
                .catch(error => {
                    console.error('Ошибка при генерации слова:', error);
                });
        }
    };

    const startPreparationTimer = () => {
        setPreparationTime(5);
    };

    // Таймер подготовки (5 секунд)
    useEffect(() => {
        if (preparationTime === null || preparationTime <= 0) {
            if (preparationTime === 0) {
                // Таймер подготовки закончился, запускаем основной таймер
                if (gameData?.settings?.timer !== 'unlimited') {
                    const timerSeconds = parseInt(gameData.settings.timer);
                    setTimeLeft(timerSeconds);
                }
            }
            return;
        }

        const timer = setInterval(() => {
            setPreparationTime(prev => {
                if (prev <= 1) {
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [preparationTime, gameData]);

    // Основной таймер игры
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0) {
            if (timeLeft === 0 && currentWord) {
                // Время истекло, переходим на страницу результата
                router.get(`/room/${roomCode}/crocodile/timeout-result`);
            }
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, currentWord, roomCode]);

    const handleCompleteTask = (success = true) => {
        const currentPlayer = gameData.players[gameData.currentPlayerIndex];

        if (window.axios) {
            window.axios.post(`/room/${roomCode}/crocodile/complete-task`, {
                playerName: currentPlayer.name,
                success: success,
            })
                .then(() => {
                    // Сбрасываем все состояния для следующего игрока
                    setCurrentWord(null);
                    setCurrentAction(null);
                    setPreparationTime(null);
                    setTimeLeft(null);
                    setShowSlotAnimation(false);
                    setSliderPosition(0);
                    sliderPositionRef.current = 0;
                    setIsDragging(false);
                    isDraggingRef.current = false;
                    // Обновляем данные игры
                    if (window.axios) {
                        window.axios.get(`/room/${roomCode}/crocodile/game-data`)
                            .then(response => {
                                setGameData(response.data);
                            });
                    }
                })
                .catch(error => {
                    console.error('Ошибка при завершении задания:', error);
                    alert(error.response?.data?.error || 'Ошибка');
                });
        }
    };

    // Логика слайдера - упрощенная версия
    const handleStart = useCallback((clientX) => {
        if (!sliderTrackRef.current || !sliderRef.current) return;
        setIsDragging(true);
        isDraggingRef.current = true;
        startXRef.current = clientX;
        startPositionRef.current = sliderPositionRef.current;
    }, []);

    const handleMove = useCallback((clientX) => {
        if (!sliderTrackRef.current || !sliderRef.current || !isDraggingRef.current) return;

        const deltaX = clientX - startXRef.current;
        const trackWidth = sliderTrackRef.current.offsetWidth;
        const sliderWidth = sliderRef.current.offsetWidth;
        const maxPosition = trackWidth - sliderWidth;

        let newPosition = startPositionRef.current + deltaX;
        newPosition = Math.max(0, Math.min(newPosition, maxPosition));
        
        setSliderPosition(newPosition);
        sliderPositionRef.current = newPosition;

        // Если слайдер достиг конца, запускаем анимацию слотов
        if (newPosition >= maxPosition - 5) {
            setIsDragging(false);
            isDraggingRef.current = false;
            startSlotAnimation();
        }
    }, [startSlotAnimation]);

    const handleEnd = useCallback(() => {
        if (!isDraggingRef.current) return;

        setIsDragging(false);
        isDraggingRef.current = false;

        if (!sliderTrackRef.current || !sliderRef.current) return;
        
        const trackWidth = sliderTrackRef.current.offsetWidth;
        const sliderWidth = sliderRef.current.offsetWidth;
        const maxPosition = trackWidth - sliderWidth;

        if (sliderPositionRef.current < maxPosition - 5) {
            setSliderPosition(0);
            sliderPositionRef.current = 0;
        }
    }, []);

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        handleStart(e.clientX);
    }, [handleStart]);

    const handleMouseUp = useCallback((e) => {
        if (isDraggingRef.current) {
            e.preventDefault();
            e.stopPropagation();
            handleEnd();
        }
    }, [handleEnd]);

    const handleTouchStart = (e) => {
        if (sliderRef.current?.contains(e.target)) {
            e.preventDefault();
            handleStart(e.touches[0].clientX);
        }
    };

    const handleTouchMove = (e) => {
        if (isDragging) {
            e.preventDefault();
            handleMove(e.touches[0].clientX);
        }
    };

    const handleTouchEnd = (e) => {
        if (isDragging) {
            e.preventDefault();
            handleEnd();
        }
    };

    // Глобальные обработчики для мыши
    useEffect(() => {
        if (!isDragging) return;

        const handleGlobalMouseMove = (e) => {
            if (isDraggingRef.current) {
                handleMove(e.clientX);
            }
        };

        const handleGlobalMouseUp = () => {
            if (isDraggingRef.current) {
                handleEnd();
            }
        };

        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging]);

    // Обработчики touch событий с passive: false
    useEffect(() => {
        const sliderElement = sliderRef.current;
        if (!sliderElement) return;

        const touchStartHandler = (e) => {
            const touch = e.touches[0];
            if (sliderElement.contains(e.target) || sliderElement.contains(touch.target)) {
                e.preventDefault();
                e.stopPropagation();
                handleStart(touch.clientX);
            }
        };

        const touchMoveHandler = (e) => {
            if (isDraggingRef.current) {
                e.preventDefault();
                e.stopPropagation();
                const touch = e.touches[0];
                if (touch) {
                    handleMove(touch.clientX);
                }
            }
        };

        const touchEndHandler = (e) => {
            if (isDraggingRef.current) {
                e.preventDefault();
                e.stopPropagation();
                handleEnd();
            }
        };

        const touchCancelHandler = (e) => {
            if (isDraggingRef.current) {
                e.preventDefault();
                e.stopPropagation();
                handleEnd();
            }
        };

        // Добавляем обработчики с passive: false
        sliderElement.addEventListener('touchstart', touchStartHandler, { passive: false });
        document.addEventListener('touchmove', touchMoveHandler, { passive: false });
        document.addEventListener('touchend', touchEndHandler, { passive: false });
        document.addEventListener('touchcancel', touchCancelHandler, { passive: false });

        return () => {
            sliderElement.removeEventListener('touchstart', touchStartHandler);
            document.removeEventListener('touchmove', touchMoveHandler);
            document.removeEventListener('touchend', touchEndHandler);
            document.removeEventListener('touchcancel', touchCancelHandler);
        };
    }, [handleStart, handleMove, handleEnd]);

    // Убеждаемся, что currentPlayerIndex правильный (должен быть 0 для первого игрока)
    // Если игра только что началась (нет currentWord и currentAction), currentPlayerIndex должен быть 0
    const actualCurrentPlayerIndex = (!gameData.currentWord && !gameData.currentAction && gameData.status === 'playing') 
        ? 0 
        : gameData.currentPlayerIndex;
    
    const currentPlayer = gameData?.players?.[actualCurrentPlayerIndex];
    const nextPlayerIndex = (actualCurrentPlayerIndex + 1) % (gameData?.players?.length || 1);
    const nextPlayer = gameData?.players?.[nextPlayerIndex];
    const currentPlayerId = currentPlayer?.id;
    const myScore = currentPlayerId ? (gameData?.scores?.[currentPlayerId] || 0) : 0;

    if (!gameData) {
        return (
            <div className={styles.container}>
                <div className={styles.content}>
                    <p>Загрузка игры...</p>
                </div>
            </div>
        );
    }

    // Определяем, какой экран показывать
    const showPassPhoneScreen = !showSlotAnimation && !currentWord && preparationTime === null;
    const showGameScreen = !showPassPhoneScreen && !showSlotAnimation;

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>🐊 Крокодил</h1>
                    {currentPlayer && showGameScreen && (
                        <div className={styles.score}>
                            Счет {currentPlayer.name}: <strong>{myScore}</strong>
                        </div>
                    )}
                </div>

                {/* Экран передачи телефона со слайдером */}
                {showPassPhoneScreen && (
                    <>
                        <div className={styles.passPhoneSection}>
                            <div className={styles.currentPlayerCard}>
                                <div className={styles.playerLabel}>Телефон у игрока:</div>
                                <div className={styles.playerName}>{currentPlayer?.name || 'Игрок'}</div>
                            </div>

                            <div className={styles.arrow}>↓</div>

                            <div className={styles.nextPlayerCard}>
                                <div className={styles.playerLabel}>Передай телефон:</div>
                                <div className={styles.playerName}>{nextPlayer?.name || 'Игрок'}</div>
                            </div>
                        </div>

                        <div className={styles.sliderSection}>
                            <div className={styles.sliderText}>Перетащите для продолжения</div>
                            <div
                                className={styles.sliderTrack}
                                ref={sliderTrackRef}
                                onMouseLeave={handleMouseUp}
                            >
                                <div
                                    className={`${styles.slider} ${isDragging ? styles.dragging : ''}`}
                                    ref={sliderRef}
                                    style={{ transform: `translateX(${sliderPosition}px)` }}
                                    onMouseDown={handleMouseDown}
                                    onTouchStart={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (e.touches[0]) {
                                            handleStart(e.touches[0].clientX);
                                        }
                                    }}
                                >
                                    <div className={styles.sliderIcon}>→</div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Анимация слотов */}
                {showSlotAnimation && (
                    <div className={styles.slotAnimation}>
                        <div className={styles.slotContainer}>
                            <div className={styles.slotColumn}>
                                <div className={styles.slotLabel}>Действие:</div>
                                <div className={styles.slot}>
                                    {slotActions.map((action, index) => (
                                        <div key={index} className={styles.slotItem}>
                                            {action === 'рассказать' ? '📢 Рассказать' : '🎭 Показать'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className={styles.slotColumn}>
                                <div className={styles.slotLabel}>Слово:</div>
                                <div className={styles.slot}>
                                    {slotWords.map((word, index) => (
                                        <div key={index} className={styles.slotItem}>
                                            {word}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Таймер подготовки */}
                {preparationTime !== null && preparationTime > 0 && !showSlotAnimation && (
                    <div className={styles.preparationTimer}>
                        <div className={styles.preparationText}>Подготовка</div>
                        <div className={styles.preparationCountdown}>{preparationTime}</div>
                    </div>
                )}

                {/* Игровой экран с словом */}
                {showGameScreen && currentWord && preparationTime === 0 && (
                    <div className={styles.gameSection}>
                        <div className={styles.wordCard}>
                            <div className={styles.actionBadge}>
                                {currentAction === 'рассказать' ? '📢 Рассказать' : '🎭 Показать'}
                            </div>
                            <div className={styles.word}>
                                {currentWord}
                            </div>
                            {timeLeft !== null && (
                                <div className={styles.timer}>
                                    {timeLeft > 0 ? `${timeLeft} сек` : 'Время вышло!'}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => handleCompleteTask(true)}
                            className={styles.completeButton}
                        >
                            ✓ Справился!
                        </button>
                    </div>
                )}

                <div className={styles.scoresSection}>
                    <h3 className={styles.scoresTitle}>Счет игроков:</h3>
                    <div className={styles.scoresList}>
                        {gameData.players.map(player => (
                            <div
                                key={player.id}
                                className={`${styles.scoreItem} ${player.id === gameData.currentPlayerId ? styles.currentPlayer : ''}`}
                            >
                                <span className={styles.playerName}>{player.name}</span>
                                <span className={styles.playerScore}>
                                    {gameData.scores[player.id] || 0}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
