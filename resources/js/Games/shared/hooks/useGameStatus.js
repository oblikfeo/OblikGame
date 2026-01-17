import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';

/**
 * Хук для проверки и синхронизации статуса игры
 * Автоматически перенаправляет на нужную страницу в зависимости от статуса
 */
export function useGameStatus(roomCode, playerId, gameType = 'spy', statusMap = {}) {
    const [gameStatus, setGameStatus] = useState(null);
    const [isChecking, setIsChecking] = useState(false);

    const checkStatus = async () => {
        if (isChecking || !window.axios) {
            return;
        }

        setIsChecking(true);
        try {
            const response = await window.axios.get(`/room/${roomCode}/${gameType}/game-data`, {
                params: { playerId }
            });

            const status = response.data.gameStatus;
            setGameStatus(status);

            // Если есть маппинг статуса на маршрут, перенаправляем
            if (statusMap[status]) {
                router.get(statusMap[status], { playerId });
            }
        } catch (error) {
            console.error('Ошибка при проверке статуса игры:', error);
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        // Проверяем статус при монтировании компонента
        checkStatus();
    }, [roomCode, playerId]);

    return { gameStatus, checkStatus, isChecking };
}
