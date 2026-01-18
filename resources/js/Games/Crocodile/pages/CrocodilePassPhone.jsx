import { useState, useEffect, useRef, useCallback } from 'react';
import { router } from '@inertiajs/react';
import styles from '../CrocodilePassPhone.module.css';

export default function CrocodilePassPhone({ roomCode, gameData: initialGameData }) {
    // Убеждаемся, что currentPlayerIndex = 0 для первого игрока при первой загрузке
    const normalizedInitialGameData = initialGameData ? (() => {
        // Если игра только что началась (нет currentWord и currentAction), currentPlayerIndex должен быть 0
        if (initialGameData.status === 'playing' && !initialGameData.currentWord && !initialGameData.currentAction) {
            console.log('CrocodilePassPhone: нормализация initialGameData: исправление currentPlayerIndex с', initialGameData.currentPlayerIndex, 'на 0');
            return {
                ...initialGameData,
                currentPlayerIndex: 0,
                currentPlayerId: initialGameData.players?.[0]?.id
            };
        }
        return initialGameData;
    })() : null;
    const [gameData, setGameData] = useState(normalizedInitialGameData);
    const [sliderPosition, setSliderPosition] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef(null);
    const sliderTrackRef = useRef(null);
    const startXRef = useRef(0);
    const startPositionRef = useRef(0);

    useEffect(() => {
        // Получаем актуальные данные игры
        if (window.axios) {
            window.axios.get(`/room/${roomCode}/crocodile/game-data`)
                .then(response => {
                    // Убеждаемся, что currentPlayerIndex правильный
                    const data = response.data;
                    // Если игра только что началась (нет currentWord и currentAction), currentPlayerIndex должен быть 0
                    if (data && data.status === 'playing' && !data.currentWord && !data.currentAction) {
                        // Это первый раунд, currentPlayerIndex должен быть 0
                        if (data.currentPlayerIndex !== 0) {
                            console.warn('Исправление currentPlayerIndex с', data.currentPlayerIndex, 'на 0');
                            data.currentPlayerIndex = 0;
                            data.currentPlayerId = data.players[0]?.id;
                        }
                    }
                    setGameData(data);
                })
                .catch(error => {
                    console.error('Ошибка при получении данных игры:', error);
                });
        }

        // Слушаем события через WebSocket
        if (!window.Echo) {
            return;
        }

        const channel = window.Echo.channel(`room.${roomCode}`);

        channel
            .listen('.crocodile.game.started', (e) => {
                // При первом запуске игры currentPlayerIndex должен быть 0 (первый игрок)
                // Убеждаемся, что currentPlayerIndex = 0 для первого игрока
                const gameDataToSet = {
                    ...e.gameData,
                    currentPlayerIndex: e.gameData?.currentPlayerIndex ?? 0,
                    currentPlayerId: e.gameData?.currentPlayerId ?? e.gameData?.players?.[0]?.id
                };
                
                // Не перезаписываем gameData, если он уже установлен и currentPlayerIndex = 0
                if (!gameData) {
                    setGameData(gameDataToSet);
                } else if (gameData.currentPlayerIndex === 0 && gameDataToSet.currentPlayerIndex === 0) {
                    // Если оба имеют currentPlayerIndex = 0, обновляем только если нужно
                    // Но сохраняем текущий currentPlayerIndex
                    setGameData(prev => ({
                        ...gameDataToSet,
                        currentPlayerIndex: prev.currentPlayerIndex,
                        currentPlayerId: prev.currentPlayerId
                    }));
                } else {
                    // В других случаях обновляем данные игры
                    setGameData(gameDataToSet);
                }
            })
            .listen('.crocodile.word.generated', (e) => {
                // Обновляем данные игры
                if (window.axios) {
                    window.axios.get(`/room/${roomCode}/crocodile/game-data`)
                        .then(response => {
                            setGameData(response.data);
                        })
                        .catch(error => {
                            console.error('Ошибка при получении данных игры:', error);
                        });
                }
            });

        return () => {
            window.Echo.leave(`room.${roomCode}`);
        };
    }, [roomCode]);

    if (!gameData) {
        return (
            <div className={styles.container}>
                <div className={styles.content}>
                    <p>Загрузка...</p>
                </div>
            </div>
        );
    }

    // Убеждаемся, что currentPlayerIndex правильный (должен быть 0 для первого игрока)
    // Если игра только что началась (нет currentWord и currentAction), currentPlayerIndex должен быть 0
    const actualCurrentPlayerIndex = (!gameData.currentWord && !gameData.currentAction && gameData.status === 'playing') 
        ? 0 
        : gameData.currentPlayerIndex;
    
    const currentPlayer = gameData.players[actualCurrentPlayerIndex];
    const nextPlayerIndex = (actualCurrentPlayerIndex + 1) % gameData.players.length;
    const nextPlayer = gameData.players[nextPlayerIndex];

    const handleComplete = useCallback(() => {
        // Переходим на страницу игры
        router.get(`/room/${roomCode}/crocodile/game`);
    }, [roomCode]);

    const handleStart = useCallback((clientX) => {
        setIsDragging(true);
        startXRef.current = clientX;
        startPositionRef.current = sliderPosition;
    }, [sliderPosition]);

    const handleMove = useCallback((clientX) => {
        if (!sliderTrackRef.current || !sliderRef.current || !isDragging) return;

        const deltaX = clientX - startXRef.current;
        const trackWidth = sliderTrackRef.current.offsetWidth;
        const sliderWidth = sliderRef.current.offsetWidth;
        const maxPosition = trackWidth - sliderWidth;

        let newPosition = startPositionRef.current + deltaX;
        newPosition = Math.max(0, Math.min(newPosition, maxPosition));
        setSliderPosition(newPosition);

        // Если слайдер достиг конца, переходим на следующую страницу
        if (newPosition >= maxPosition - 10) {
            setIsDragging(false);
            setTimeout(() => {
                handleComplete();
            }, 100);
        }
    }, [isDragging, handleComplete]);

    const handleEnd = useCallback(() => {
        if (!isDragging) return;
        
        setIsDragging(false);
        
        // Если слайдер не достиг конца, возвращаем его в начало
        const trackWidth = sliderTrackRef.current?.offsetWidth || 0;
        const sliderWidth = sliderRef.current?.offsetWidth || 0;
        const maxPosition = trackWidth - sliderWidth;
        
        setSliderPosition(prevPosition => {
            if (prevPosition < maxPosition - 10) {
                return 0;
            }
            return prevPosition;
        });
    }, [isDragging]);

    // Обработчики для мыши
    const handleMouseDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleStart(e.clientX);
    };

    const handleMouseUp = (e) => {
        if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
            handleEnd();
        }
    };

    // Обработчики для touch
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

    // Добавляем глобальные обработчики для мыши
    useEffect(() => {
        if (!isDragging) return;

        const handleGlobalMouseMove = (e) => {
            handleMove(e.clientX);
        };

        const handleGlobalMouseUp = () => {
            handleEnd();
        };

        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
        
        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging, handleMove, handleEnd]);

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>🐊 Крокодил</h1>
                </div>

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
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            <div className={styles.sliderIcon}>→</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
