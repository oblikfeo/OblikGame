import { useWebSocket } from '../../shared/hooks/useWebSocket';
import { router } from '@inertiajs/react';

/**
 * Хук для работы с WebSocket событиями игры Шпион
 * Централизует всю логику обработки событий
 */
export function useSpyWebSocket(roomCode, playerId, callbacks = {}) {
    const {
        onGameStarted,
        onGameContinue,
        onReadyToVote,
        onVotingStarted,
        onResultsReady,
        onGuessSubmitted,
        onGuessVoteSubmitted,
        onGuessResult,
        onPlayerEliminated,
        onReadyToStart,
        onPlayerJoined,
        onPlayerLeft,
        onVoteSubmitted,
    } = callbacks;

    useWebSocket(roomCode, {
        '.spy.game.started': (e) => {
            if (onGameStarted) {
                onGameStarted(e);
            } else {
                // Дефолтное поведение - переход на страницу игры
                router.get(`/room/${roomCode}/spy/game`, { playerId });
            }
        },
        '.spy.game.continue': (e) => {
            if (onGameContinue) {
                onGameContinue(e);
            } else {
                router.get(`/room/${roomCode}/spy/game`, { playerId });
            }
        },
        '.spy.ready.to.vote': (e) => {
            if (onReadyToVote) {
                onReadyToVote(e);
            }
        },
        '.spy.vote.submitted': (e) => {
            if (onVoteSubmitted) {
                onVoteSubmitted(e);
            }
        },
        '.spy.voting.started': (e) => {
            if (onVotingStarted) {
                onVotingStarted(e);
            } else {
                router.get(`/room/${roomCode}/spy/voting`, { playerId });
            }
        },
        '.spy.results.ready': (e) => {
            if (onResultsReady) {
                onResultsReady(e);
            } else {
                router.get(`/room/${roomCode}/spy/results`, { playerId });
            }
        },
        '.spy.guess.submitted': (e) => {
            if (onGuessSubmitted) {
                onGuessSubmitted(e);
            }
        },
        '.spy.guess.vote.submitted': (e) => {
            if (onGuessVoteSubmitted) {
                onGuessVoteSubmitted(e);
            }
        },
        '.spy.guess.result': (e) => {
            if (onGuessResult) {
                onGuessResult(e);
            }
        },
        '.player.eliminated': (e) => {
            if (e.playerId === playerId) {
                if (onPlayerEliminated) {
                    onPlayerEliminated(e);
                } else {
                    // Дефолтное поведение
                    router.get('/');
                }
            }
        },
        '.spy.ready.to.start': (e) => {
            if (onReadyToStart) {
                onReadyToStart(e);
            }
        },
        '.player.joined': (e) => {
            if (onPlayerJoined) {
                onPlayerJoined(e);
            }
        },
        '.player.left': (e) => {
            if (onPlayerLeft) {
                onPlayerLeft(e);
            }
        },
    });
}
