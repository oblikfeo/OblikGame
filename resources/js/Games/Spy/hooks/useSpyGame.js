import { useState, useCallback } from 'react';

/**
 * Хук для работы с API игры Шпион
 * Централизует все запросы к серверу
 */
export function useSpyGame(roomCode, playerId) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const readyToStart = useCallback(async () => {
        if (!window.axios) {
            setError('Axios не инициализирован');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await window.axios.post(`/room/${roomCode}/spy/ready-to-start`, {
                playerId,
            });
            return response.data;
        } catch (err) {
            const errorMessage = err.response?.data?.error || 
                               err.response?.data?.message || 
                               'Ошибка при отправке готовности';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [roomCode, playerId]);

    const readyToVote = useCallback(async () => {
        if (!window.axios) {
            setError('Axios не инициализирован');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await window.axios.post(`/room/${roomCode}/spy/ready-to-vote`, {
                playerId,
            });
            return response.data;
        } catch (err) {
            const errorMessage = err.response?.data?.error || 
                               err.response?.data?.message || 
                               'Ошибка при голосовании за начало голосования';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [roomCode, playerId]);

    const submitVote = useCallback(async (votedForId) => {
        if (!window.axios) {
            setError('Axios не инициализирован');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await window.axios.post(`/room/${roomCode}/spy/vote`, {
                playerId,
                votedForId,
            });
            return response.data;
        } catch (err) {
            const errorMessage = err.response?.data?.error || 
                               err.response?.data?.message || 
                               'Ошибка при голосовании';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [roomCode, playerId]);

    const submitGuess = useCallback(async (guessedWord) => {
        if (!window.axios) {
            setError('Axios не инициализирован');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await window.axios.post(`/room/${roomCode}/spy/submit-guess`, {
                playerId,
                guessedWord: guessedWord.trim(),
            });
            return response.data;
        } catch (err) {
            const errorMessage = err.response?.data?.error || 
                               err.response?.data?.message || 
                               'Ошибка при отправке угадывания';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [roomCode, playerId]);

    const voteGuess = useCallback(async (vote) => {
        if (!window.axios) {
            setError('Axios не инициализирован');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await window.axios.post(`/room/${roomCode}/spy/vote-guess`, {
                playerId,
                vote,
            });
            return response.data;
        } catch (err) {
            const errorMessage = err.response?.data?.error || 
                               err.response?.data?.message || 
                               'Ошибка при голосовании';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [roomCode, playerId]);

    const getGameData = useCallback(async () => {
        if (!window.axios) {
            setError('Axios не инициализирован');
            return null;
        }

        try {
            const response = await window.axios.get(`/room/${roomCode}/spy/game-data`, {
                params: { playerId },
                validateStatus: (status) => {
                    // 404 - это нормально (игра еще не начата), не считаем это ошибкой
                    return status === 200 || status === 404;
                }
            });
            
            // Если 404, возвращаем null
            if (response.status === 404) {
                return null;
            }
            
            return response.data;
        } catch (err) {
            // Если игра не найдена (404), это нормально - игра еще не начата
            if (err.response?.status === 404) {
                return null;
            }
            
            const errorMessage = err.response?.data?.error || 
                               err.response?.data?.message || 
                               'Ошибка при получении данных игры';
            setError(errorMessage);
            throw err;
        }
    }, [roomCode, playerId]);

    const getGuessStatus = useCallback(async () => {
        if (!window.axios) {
            setError('Axios не инициализирован');
            return null;
        }

        try {
            const response = await window.axios.get(`/room/${roomCode}/spy/guess-status`, {
                params: { playerId }
            });
            return response.data;
        } catch (err) {
            const errorMessage = err.response?.data?.error || 
                               err.response?.data?.message || 
                               'Ошибка при получении статуса угадывания';
            setError(errorMessage);
            throw err;
        }
    }, [roomCode, playerId]);

    const getGuessOptions = useCallback(async () => {
        if (!window.axios) {
            setError('Axios не инициализирован');
            return null;
        }

        try {
            const response = await window.axios.get(`/room/${roomCode}/spy/guess-options`, {
                params: { playerId }
            });
            return response.data;
        } catch (err) {
            const errorMessage = err.response?.data?.error || 
                               err.response?.data?.message || 
                               'Ошибка при получении опций для угадывания';
            setError(errorMessage);
            throw err;
        }
    }, [roomCode, playerId]);

    return {
        readyToStart,
        readyToVote,
        submitVote,
        submitGuess,
        voteGuess,
        getGameData,
        getGuessStatus,
        getGuessOptions,
        isLoading,
        error,
    };
}
