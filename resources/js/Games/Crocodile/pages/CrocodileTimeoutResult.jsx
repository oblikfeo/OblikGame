import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import styles from '../CrocodileTimeoutResult.module.css';

export default function CrocodileTimeoutResult({ roomCode, gameData: initialGameData }) {
    const [gameData, setGameData] = useState(initialGameData);

    useEffect(() => {
        // Получаем актуальные данные игры
        if (window.axios) {
            window.axios.get(`/room/${roomCode}/crocodile/game-data`)
                .then(response => {
                    setGameData(response.data);
                })
                .catch(error => {
                    console.error('Ошибка при получении данных игры:', error);
                });
        }
    }, [roomCode]);

    const handleResult = (success) => {
        const currentPlayer = gameData.players[gameData.currentPlayerIndex];
        
        if (window.axios) {
            window.axios.post(`/room/${roomCode}/crocodile/complete-task`, {
                playerName: currentPlayer.name,
                success: success,
            })
            .then(() => {
                // Переходим на страницу передачи телефона следующему игроку
                router.get(`/room/${roomCode}/crocodile/pass-phone`);
            })
            .catch(error => {
                console.error('Ошибка при завершении задания:', error);
                alert(error.response?.data?.error || 'Ошибка');
            });
        }
    };

    if (!gameData) {
        return (
            <div className={styles.container}>
                <div className={styles.content}>
                    <p>Загрузка...</p>
                </div>
            </div>
        );
    }

    const currentPlayer = gameData.players[gameData.currentPlayerIndex];
    const currentWord = gameData.currentWord;
    const currentAction = gameData.currentAction;

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>🐊 Крокодил</h1>
                </div>

                <div className={styles.resultSection}>
                    <div className={styles.timeoutMessage}>
                        <div className={styles.timeoutIcon}>⏱️</div>
                        <h2 className={styles.timeoutTitle}>Время истекло!</h2>
                        <p className={styles.timeoutText}>
                            Игрок <strong>{currentPlayer?.name || 'Игрок'}</strong> не успел завершить задание
                        </p>
                    </div>

                    <div className={styles.taskInfo}>
                        <div className={styles.taskAction}>
                            {currentAction === 'рассказать' ? '📢 Рассказать' : '🎭 Показать'}
                        </div>
                        <div className={styles.taskWord}>{currentWord}</div>
                    </div>

                    <div className={styles.questionSection}>
                        <h3 className={styles.questionTitle}>Успел ли игрок ответить?</h3>
                        <div className={styles.buttonsGroup}>
                            <button 
                                onClick={() => handleResult(true)}
                                className={`${styles.resultButton} ${styles.successButton}`}
                            >
                                ✓ Да, успел (+1 балл)
                            </button>
                            <button 
                                onClick={() => handleResult(false)}
                                className={`${styles.resultButton} ${styles.failButton}`}
                            >
                                ✗ Нет, не успел (0 баллов)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
