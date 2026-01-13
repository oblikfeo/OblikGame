<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use App\Events\SpyGameStarted;
use App\Events\SpyVotingStarted;
use App\Events\SpyVoteSubmitted;
use App\Events\SpyResultsReady;
use App\Events\PlayerJoined;
use App\Events\SpyReadyToVote;
use App\Events\SpyGameContinue;

class SpyController extends Controller
{
    /**
     * Массив локаций для игры Шпион
     */
    private function getLocations(): array
    {
        return [
            'Пляж',
            'Школа',
            'Больница',
            'Ресторан',
            'Аэропорт',
            'Банк',
            'Кинотеатр',
            'Спортзал',
            'Библиотека',
            'Парк',
            'Офис',
            'Магазин',
            'Цирк',
            'Музей',
            'Кафе',
            'Отель',
            'Вокзал',
            'Зоопарк',
            'Театр',
            'Полицейский участок',
        ];
    }

    /**
     * Показать правила игры
     */
    public function showRules(Request $request, string $roomCode)
    {
        $roomCode = strtoupper($roomCode);
        $playerId = $request->query('playerId');
        
        if (!$playerId) {
            return redirect()->route('room.show', ['roomCode' => $roomCode]);
        }

        // Получаем данные игрока из сессии
        $playerData = session("room_{$roomCode}_player_{$playerId}");
        $isHost = session("room_{$roomCode}_host") === $playerId;
        
        // Если данных игрока нет в сессии, пытаемся восстановить из кеша
        if (!$playerData) {
            $players = Cache::get("room_{$roomCode}_players", []);
            $playerData = $players[$playerId] ?? null;
        }
        
        // Если игрок не найден, создаем его данные
        if (!$playerData) {
            $playerName = $request->query('playerName') ?? 'Игрок';
            $playerData = [
                'id' => $playerId,
                'name' => $playerName,
                'isHost' => $isHost,
            ];
            session(["room_{$roomCode}_player_{$playerId}" => $playerData]);
        }
        
        // Получаем список игроков
        $players = Cache::get("room_{$roomCode}_players", []);
        
        // Убеждаемся, что текущий игрок есть в списке
        if (!isset($players[$playerId])) {
            $players[$playerId] = $playerData;
            Cache::put("room_{$roomCode}_players", $players, now()->addHours(24));
            
            // Отправляем событие о присоединении (если игрок действительно вернулся)
            broadcast(new PlayerJoined($roomCode, $playerData));
        }
        
        $players = array_values($players);

        return Inertia::render('SpyRules', [
            'roomCode' => $roomCode,
            'playerId' => $playerId,
            'players' => $players,
        ]);
    }

    /**
     * Начать игру Шпион
     */
    public function startGame(Request $request, string $roomCode)
    {
        $roomCode = strtoupper($roomCode);
        
        // Получаем список игроков
        $players = Cache::get("room_{$roomCode}_players", []);
        $players = array_values($players);
        
        if (count($players) < 3) {
            return response()->json(['error' => 'Нужно минимум 3 игрока'], 400);
        }

        // Выбираем случайную локацию
        $locations = $this->getLocations();
        $location = $locations[array_rand($locations)];

        // Определяем количество шпионов в зависимости от количества игроков
        $playerCount = count($players);
        $spyCount = 1;
        if ($playerCount >= 5 && $playerCount <= 6) {
            $spyCount = 2;
        } elseif ($playerCount >= 7) {
            $spyCount = 3;
        }

        // Выбираем случайных шпионов
        $spyIds = [];
        $availablePlayers = $players;
        for ($i = 0; $i < $spyCount && count($availablePlayers) > 0; $i++) {
            $spyIndex = array_rand($availablePlayers);
            $spyId = $availablePlayers[$spyIndex]['id'];
            $spyIds[] = $spyId;
            // Удаляем выбранного игрока из доступных
            unset($availablePlayers[$spyIndex]);
            $availablePlayers = array_values($availablePlayers);
        }

        // Создаем данные игры
        $gameData = [
            'location' => $location,
            'spyIds' => $spyIds, // Массив ID шпионов
            'spyId' => $spyIds[0], // Для обратной совместимости
            'players' => $players,
            'status' => 'card_reveal', // card_reveal, playing, voting, results
            'votes' => [],
            'readyToVote' => [], // Игроки, готовые начать голосование
            'startedAt' => now()->toIso8601String(),
            'eliminatedPlayers' => [], // Исключенные игроки
        ];

        // Сохраняем данные игры в кеш
        Cache::put("spy_game_{$roomCode}", $gameData, now()->addHours(2));

        // Отправляем событие о начале игры
        broadcast(new SpyGameStarted($roomCode, $gameData));

        return response()->json([
            'success' => true,
            'gameData' => $gameData,
        ]);
    }

    /**
     * Получить данные игры для игрока
     */
    public function getGameData(Request $request, string $roomCode)
    {
        $roomCode = strtoupper($roomCode);
        $playerId = $request->query('playerId');
        
        $gameData = Cache::get("spy_game_{$roomCode}");
        
        if (!$gameData) {
            return response()->json(['error' => 'Игра не найдена'], 404);
        }

        // Определяем роль игрока
        $spyIds = $gameData['spyIds'] ?? [$gameData['spyId']]; // Поддержка старого формата
        $isSpy = in_array($playerId, $spyIds);
        
        $playerData = [
            'role' => $isSpy ? 'spy' : 'player',
            'location' => $isSpy ? null : $gameData['location'],
            'gameStatus' => $gameData['status'],
        ];

        return response()->json($playerData);
    }

    /**
     * Показать страницу игры
     */
    public function showGame(Request $request, string $roomCode)
    {
        $roomCode = strtoupper($roomCode);
        $playerId = $request->query('playerId');
        
        if (!$playerId) {
            return redirect()->route('room.show', ['roomCode' => $roomCode]);
        }

        $gameData = Cache::get("spy_game_{$roomCode}");
        
        if (!$gameData) {
            return redirect()->route('spy.rules', ['roomCode' => $roomCode, 'playerId' => $playerId]);
        }

        // Если игра в статусе results и не закончилась, возвращаем к этапу обсуждения
        if ($gameData['status'] === 'results' && isset($gameData['results'])) {
            $results = $gameData['results'];
            if (isset($results['continueGame']) && $results['continueGame'] && !isset($results['gameEnded'])) {
                // Возвращаем игру к этапу обсуждения
                $gameData['status'] = 'playing';
                $gameData['readyToVote'] = [];
                $gameData['votes'] = [];
                unset($gameData['results']);
                
                Cache::put("spy_game_{$roomCode}", $gameData, now()->addHours(2));
                
                // Отправляем событие о продолжении игры
                $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
                $activePlayers = array_filter($gameData['players'], function($player) use ($eliminatedPlayers) {
                    return !in_array($player['id'], $eliminatedPlayers);
                });
                broadcast(new SpyGameContinue($roomCode, array_values($activePlayers)));
            }
        }

        $spyIds = $gameData['spyIds'] ?? [$gameData['spyId']]; // Поддержка старого формата
        $isSpy = in_array($playerId, $spyIds);
        
        // Получаем только активных игроков для отображения
        $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
        $activePlayers = array_filter($gameData['players'], function($player) use ($eliminatedPlayers) {
            return !in_array($player['id'], $eliminatedPlayers);
        });
        
        return Inertia::render('Spy', [
            'roomCode' => $roomCode,
            'playerId' => $playerId,
            'isSpy' => $isSpy,
            'location' => $isSpy ? null : $gameData['location'],
            'gameStatus' => $gameData['status'],
            'players' => array_values($activePlayers),
            'readyToVote' => $gameData['readyToVote'] ?? [],
        ]);
    }

    /**
     * Голосовать за начало голосования
     */
    public function readyToVote(Request $request, string $roomCode)
    {
        $roomCode = strtoupper($roomCode);
        $playerId = $request->input('playerId');
        
        $gameData = Cache::get("spy_game_{$roomCode}");
        
        if (!$gameData) {
            return response()->json(['error' => 'Игра не найдена'], 404);
        }

        if (!isset($gameData['readyToVote'])) {
            $gameData['readyToVote'] = [];
        }

        // Добавляем игрока в список готовых
        if (!in_array($playerId, $gameData['readyToVote'])) {
            $gameData['readyToVote'][] = $playerId;
        }
        
        Cache::put("spy_game_{$roomCode}", $gameData, now()->addHours(2));

        // Отправляем событие
        broadcast(new SpyReadyToVote($roomCode, $playerId, $gameData['readyToVote']));

        // Проверяем, все ли готовы (только активные игроки)
        $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
        $activePlayers = array_filter($gameData['players'], function($player) use ($eliminatedPlayers) {
            return !in_array($player['id'], $eliminatedPlayers);
        });
        $allActivePlayerIds = array_column($activePlayers, 'id');
        $readyPlayers = $gameData['readyToVote'];
        
        if (count($readyPlayers) === count($allActivePlayerIds) && count($allActivePlayerIds) > 0) {
            // Все готовы, начинаем голосование
            $this->startVotingInternal($roomCode, $gameData);
        }

        return response()->json([
            'success' => true,
            'readyPlayers' => $gameData['readyToVote'],
        ]);
    }

    /**
     * Начать голосование (внутренний метод)
     */
    private function startVotingInternal(string $roomCode, array $gameData): void
    {
        $gameData['status'] = 'voting';
        $gameData['votes'] = [];
        $gameData['readyToVote'] = [];
        
        // Получаем только активных игроков (не исключенных)
        $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
        $activePlayers = array_filter($gameData['players'], function($player) use ($eliminatedPlayers) {
            return !in_array($player['id'], $eliminatedPlayers);
        });
        $activePlayers = array_values($activePlayers);
        
        Cache::put("spy_game_{$roomCode}", $gameData, now()->addHours(2));

        broadcast(new SpyVotingStarted($roomCode, $activePlayers));
    }

    /**
     * Начать голосование (старый метод для совместимости)
     */
    public function startVoting(Request $request, string $roomCode)
    {
        $roomCode = strtoupper($roomCode);
        
        $gameData = Cache::get("spy_game_{$roomCode}");
        
        if (!$gameData) {
            return response()->json(['error' => 'Игра не найдена'], 404);
        }

        $this->startVotingInternal($roomCode, $gameData);

        return response()->json(['success' => true]);
    }

    /**
     * Показать страницу голосования
     */
    public function showVoting(Request $request, string $roomCode)
    {
        $roomCode = strtoupper($roomCode);
        $playerId = $request->query('playerId');
        
        if (!$playerId) {
            return redirect()->route('room.show', ['roomCode' => $roomCode]);
        }

        $gameData = Cache::get("spy_game_{$roomCode}");
        
        if (!$gameData || $gameData['status'] !== 'voting') {
            return redirect()->route('spy.game', ['roomCode' => $roomCode, 'playerId' => $playerId]);
        }

        // Получаем только активных игроков (не исключенных)
        $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
        $activePlayers = array_filter($gameData['players'], function($player) use ($eliminatedPlayers) {
            return !in_array($player['id'], $eliminatedPlayers);
        });
        $activePlayers = array_values($activePlayers);

        return Inertia::render('SpyVoting', [
            'roomCode' => $roomCode,
            'playerId' => $playerId,
            'players' => $activePlayers,
            'votes' => $gameData['votes'] ?? [],
            'eliminatedPlayers' => $eliminatedPlayers,
        ]);
    }

    /**
     * Проголосовать за игрока
     */
    public function submitVote(Request $request, string $roomCode)
    {
        $roomCode = strtoupper($roomCode);
        $playerId = $request->input('playerId');
        $votedForId = $request->input('votedForId');
        
        $gameData = Cache::get("spy_game_{$roomCode}");
        
        if (!$gameData) {
            return response()->json(['error' => 'Игра не найдена'], 404);
        }

        // Проверяем, что игрок не исключен
        $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
        if (in_array($playerId, $eliminatedPlayers)) {
            return response()->json(['error' => 'Вы исключены из игры'], 400);
        }

        // Проверяем, что игрок, за которого голосуют, не исключен
        if (in_array($votedForId, $eliminatedPlayers)) {
            return response()->json(['error' => 'Этот игрок уже исключен'], 400);
        }

        if (!isset($gameData['votes'])) {
            $gameData['votes'] = [];
        }

        // Сохраняем голос
        $gameData['votes'][$playerId] = $votedForId;
        
        Cache::put("spy_game_{$roomCode}", $gameData, now()->addHours(2));

        // Находим имена игроков
        $player = collect($gameData['players'])->firstWhere('id', $playerId);
        $votedForPlayer = collect($gameData['players'])->firstWhere('id', $votedForId);
        
        $playerName = $player['name'] ?? 'Игрок';
        $votedForName = $votedForPlayer['name'] ?? 'Игрок';

        // Отправляем событие о голосе
        broadcast(new SpyVoteSubmitted($roomCode, $playerId, $playerName, $votedForId, $votedForName));

        // Перечитываем данные из кеша для проверки (на случай параллельных запросов)
        $currentGameData = Cache::get("spy_game_{$roomCode}");
        if (!$currentGameData) {
            return response()->json(['error' => 'Игра не найдена'], 404);
        }

        // Проверяем, все ли проголосовали (только активные игроки)
        $eliminatedPlayers = $currentGameData['eliminatedPlayers'] ?? [];
        $activePlayers = array_filter($currentGameData['players'], function($player) use ($eliminatedPlayers) {
            return !in_array($player['id'], $eliminatedPlayers);
        });
        $allActivePlayerIds = array_column($activePlayers, 'id');
        $votedPlayers = array_keys($currentGameData['votes'] ?? []);
        
        if (count($votedPlayers) === count($allActivePlayerIds) && count($allActivePlayerIds) > 0) {
            // Все проголосовали, подсчитываем результаты
            $this->calculateResults($roomCode, $currentGameData);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Подсчитать результаты голосования
     */
    private function calculateResults(string $roomCode, array $gameData): void
    {
        $votes = $gameData['votes'];
        $voteCounts = array_count_values($votes);
        
        // Получаем активных игроков (не исключенных)
        $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
        $activePlayers = array_filter($gameData['players'], function($player) use ($eliminatedPlayers) {
            return !in_array($player['id'], $eliminatedPlayers);
        });
        
        // Подсчитываем голоса только для активных игроков
        $activeVoteCounts = [];
        foreach ($voteCounts as $playerId => $count) {
            if (!in_array($playerId, $eliminatedPlayers)) {
                $activeVoteCounts[$playerId] = $count;
            }
        }
        
        // Если нет голосов, завершаем
        if (empty($activeVoteCounts)) {
            return;
        }
        
        // Находим игрока с наибольшим количеством голосов
        arsort($activeVoteCounts);
        $mostVotedId = array_key_first($activeVoteCounts);
        $maxVotes = $activeVoteCounts[$mostVotedId];
        
        // Проверяем, есть ли ничья (несколько игроков с максимальным количеством голосов)
        $playersWithMaxVotes = [];
        foreach ($activeVoteCounts as $playerId => $count) {
            if ($count === $maxVotes) {
                $playersWithMaxVotes[] = $playerId;
            }
        }
        
        $spyIds = $gameData['spyIds'] ?? [$gameData['spyId']];
        $isSpy = in_array($mostVotedId, $spyIds);
        
        // Если ничья (больше одного игрока с максимальным количеством голосов), повторяем раунд
        if (count($playersWithMaxVotes) > 1) {
            // Проверяем, осталось ли достаточно игроков для продолжения
            if (count($activePlayers) <= 2) {
                // Слишком мало игроков, завершаем игру
                $results = [
                    'voteCounts' => $voteCounts,
                    'activeVoteCounts' => $activeVoteCounts,
                    'mostVotedId' => null,
                    'maxVotes' => $maxVotes,
                    'isSpy' => false,
                    'location' => $gameData['location'],
                    'spyIds' => $spyIds,
                    'spyId' => $spyIds[0],
                    'eliminatedPlayerId' => null,
                    'isTie' => true,
                    'gameEnded' => true,
                    'message' => 'Ничья! Слишком мало игроков для продолжения.',
                ];
                
                $gameData['status'] = 'results';
                $gameData['results'] = $results;
                Cache::put("spy_game_{$roomCode}", $gameData, now()->addHours(2));
                broadcast(new SpyResultsReady($roomCode, $results));
                return;
            }
            
            // При ничьей возвращаем к этапу обсуждения (не сразу к голосованию)
            $gameData['status'] = 'playing';
            $gameData['votes'] = [];
            $gameData['readyToVote'] = [];
            
            Cache::put("spy_game_{$roomCode}", $gameData, now()->addHours(2));
            
            // Отправляем событие о продолжении игры (возврат к обсуждению)
            broadcast(new SpyGameContinue($roomCode, array_values($activePlayers)));
            
            return;
        }
        
        // Выбывает только игрок с максимумом голосов
        if (!isset($gameData['eliminatedPlayers'])) {
            $gameData['eliminatedPlayers'] = [];
        }
        $gameData['eliminatedPlayers'][] = $mostVotedId;
        
        // Проверяем, остались ли активные игроки после выбывания
        $activePlayersAfterElimination = array_filter($gameData['players'], function($player) use ($gameData) {
            $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
            return !in_array($player['id'], $eliminatedPlayers);
        });
        $activePlayersAfterElimination = array_values($activePlayersAfterElimination);
        
        // Проверяем условия окончания игры
        $activeSpyIds = array_filter($spyIds, function($spyId) use ($gameData) {
            $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
            return !in_array($spyId, $eliminatedPlayers);
        });
        
        $gameEnded = false;
        $gameEndReason = null;
        
        // Игра заканчивается, если:
        // 1. Все шпионы выбыли (игроки победили)
        if (count($activeSpyIds) === 0) {
            $gameEnded = true;
            $gameEndReason = 'spies_eliminated';
        }
        // 2. Осталось слишком мало игроков (меньше 3)
        elseif (count($activePlayersAfterElimination) < 3) {
            $gameEnded = true;
            $gameEndReason = 'not_enough_players';
        }
        
        $results = [
            'voteCounts' => $voteCounts,
            'activeVoteCounts' => $activeVoteCounts,
            'mostVotedId' => $mostVotedId,
            'maxVotes' => $maxVotes,
            'isSpy' => $isSpy,
            'location' => $gameData['location'],
            'spyIds' => $spyIds,
            'spyId' => $spyIds[0], // Для обратной совместимости
            'eliminatedPlayerId' => $mostVotedId,
            'isTie' => false,
            'gameEnded' => $gameEnded,
            'gameEndReason' => $gameEndReason,
            'continueGame' => !$gameEnded, // Флаг для продолжения игры
        ];

        $gameData['status'] = 'results';
        $gameData['results'] = $results;
        
        Cache::put("spy_game_{$roomCode}", $gameData, now()->addHours(2));

        broadcast(new SpyResultsReady($roomCode, $results));
    }

    /**
     * Показать страницу результатов
     */
    public function showResults(Request $request, string $roomCode)
    {
        $roomCode = strtoupper($roomCode);
        $playerId = $request->query('playerId');
        
        if (!$playerId) {
            return redirect()->route('room.show', ['roomCode' => $roomCode]);
        }

        $gameData = Cache::get("spy_game_{$roomCode}");
        
        if (!$gameData || !isset($gameData['results'])) {
            return redirect()->route('spy.game', ['roomCode' => $roomCode, 'playerId' => $playerId]);
        }

        return Inertia::render('SpyResults', [
            'roomCode' => $roomCode,
            'playerId' => $playerId,
            'results' => $gameData['results'],
            'players' => $gameData['players'],
        ]);
    }
}
