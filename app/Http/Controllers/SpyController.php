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
use App\Events\SpyReadyToStart;
use App\Events\SpyGuessSubmitted;
use App\Events\SpyGuessVoteSubmitted;
use App\Events\SpyGuessResult;
use App\Events\PlayerEliminated;

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
            'Дом',
            'Квартира',
            'Двор',
            'Улица',
            'Площадь',
            'Рынок',
            'Супермаркет',
            'Торговый центр',
            'Парковка',
            'Почта',
            'Детский сад',
            'Университет',
            'Стадион',
            'Бассейн',
            'Каток',
            'Фитнес-клуб',
            'Бар',
            'Ночной клуб',
            'Кофейня',
            'Столовая',
            'Аптека',
            'Поликлиника',
            'Метро',
            'Автобус',
            'Такси',
            'Заправка',
            'Ферма',
            'Лес',
            'Озеро',
            'Река',
            'Горы',
            'Остров',
            'Курорт',
            'Аквапарк',
            'Луна-парк',
            'Салон красоты',
            'Парикмахерская',
            'Гараж',
            'Склад',
            'Пожарная часть',
            'Суд',
            'Порт',
            'Телестудия',
            'Радио',
            'Фабрика',
            'Завод',
            'Церковь',
        ];
    }

    
    /**
     * Показать правила игры
     */
    public function showRules(Request $request, string $roomCode)
    {
        // Код комнаты теперь только цифры (3 цифры)
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

        // Получаем список готовых игроков (если есть)
        $readyToStart = Cache::get("spy_ready_to_start_{$roomCode}", []);

        return Inertia::render('Games/Spy/pages/SpyRules', [
            'roomCode' => $roomCode,
            'playerId' => $playerId,
            'players' => $players,
        ]);
    }

    /**
     * Голосовать за готовность к старту игры
     */
    public function readyToStart(Request $request, string $roomCode)
    {
        // Код комнаты теперь только цифры (3 цифры)
        $playerId = $request->input('playerId');
        
        if (!$playerId) {
            return response()->json(['error' => 'Не указан playerId'], 400);
        }

        // Получаем список игроков
        $players = Cache::get("room_{$roomCode}_players", []);
        $players = array_values($players);
        
        if (count($players) < 3) {
            return response()->json(['error' => 'Нужно минимум 3 игрока'], 400);
        }

        // Получаем список готовых игроков
        $readyToStart = Cache::get("spy_ready_to_start_{$roomCode}", []);
        
        // Добавляем игрока в список готовых
        if (!in_array($playerId, $readyToStart)) {
            $readyToStart[] = $playerId;
        }
        
        // Сохраняем список готовых игроков
        Cache::put("spy_ready_to_start_{$roomCode}", $readyToStart, now()->addHours(2));
        
        // Отправляем событие
        broadcast(new SpyReadyToStart($roomCode, $playerId, $readyToStart));
        
        // Проверяем, все ли готовы
        $allPlayerIds = array_column($players, 'id');
        if (count($readyToStart) === count($allPlayerIds) && count($allPlayerIds) >= 3) {
            // Все готовы, запускаем игру
            $this->startGameInternal($roomCode);
        }

        return response()->json([
            'success' => true,
            'readyPlayers' => $readyToStart,
        ]);
    }

    /**
     * Начать игру Шпион (внутренний метод)
     */
    private function startGameInternal(string $roomCode): void
    {
        // Код комнаты теперь только цифры (3 цифры)
        
        // Получаем список игроков
        $players = Cache::get("room_{$roomCode}_players", []);
        $players = array_values($players);
        
        if (count($players) < 3) {
            return;
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
        
        // Очищаем список готовых к старту
        Cache::forget("spy_ready_to_start_{$roomCode}");

        // Отправляем событие о начале игры
        broadcast(new SpyGameStarted($roomCode, $gameData));
    }

    /**
     * Начать игру Шпион (публичный метод для обратной совместимости)
     * Теперь игра запускается автоматически когда все игроки готовы
     */
    public function startGame(Request $request, string $roomCode)
    {
        // Проверяем готовность всех игроков
        $players = Cache::get("room_{$roomCode}_players", []);
        $players = array_values($players);
        
        if (count($players) < 3) {
            return response()->json(['error' => 'Нужно минимум 3 игрока'], 400);
        }

        $readyToStart = Cache::get("spy_ready_to_start_{$roomCode}", []);
        $allPlayerIds = array_column($players, 'id');
        
        // Если все готовы, запускаем игру
        if (count($readyToStart) === count($allPlayerIds) && count($allPlayerIds) >= 3) {
            $this->startGameInternal($roomCode);
            return response()->json(['success' => true]);
        }
        
        // Если не все готовы, возвращаем ошибку
        return response()->json(['error' => 'Не все игроки готовы'], 400);
    }

    /**
     * Получить данные игры для игрока
     */
    public function getGameData(Request $request, string $roomCode)
    {
        // Код комнаты теперь только цифры (3 цифры)
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
            'gameStatus' => $gameData['status'] ?? 'unknown',
        ];

        return response()->json($playerData);
    }

    /**
     * Показать страницу игры
     */
    public function showGame(Request $request, string $roomCode)
    {
        // Код комнаты теперь только цифры (3 цифры)
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

        // Проверяем, не исключен ли игрок
        $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
        if (in_array($playerId, $eliminatedPlayers)) {
            // Игрок исключен, перенаправляем на главный экран
            return redirect('/')->with('message', 'Вы были исключены из игры');
        }
        
        $spyIds = $gameData['spyIds'] ?? [$gameData['spyId']]; // Поддержка старого формата
        $isSpy = in_array($playerId, $spyIds);
        
        // Получаем только активных игроков для отображения
        $activePlayers = array_filter($gameData['players'], function($player) use ($eliminatedPlayers) {
            return !in_array($player['id'], $eliminatedPlayers);
        });
        
        return Inertia::render('Games/Spy/pages/SpyGame', [
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
        // Код комнаты теперь только цифры (3 цифры)
        $playerId = $request->input('playerId');
        
        $gameData = Cache::get("spy_game_{$roomCode}");
        
        if (!$gameData) {
            return response()->json(['error' => 'Игра не найдена'], 404);
        }

        // Проверяем, не исключен ли игрок
        $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
        if (in_array($playerId, $eliminatedPlayers)) {
            return response()->json(['error' => 'Вы были исключены из игры'], 403);
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
        // Код комнаты теперь только цифры (3 цифры)
        
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
        // Код комнаты теперь только цифры (3 цифры)
        $playerId = $request->query('playerId');
        
        if (!$playerId) {
            return redirect()->route('room.show', ['roomCode' => $roomCode]);
        }

        $gameData = Cache::get("spy_game_{$roomCode}");
        
        if (!$gameData || $gameData['status'] !== 'voting') {
            return redirect()->route('spy.game', ['roomCode' => $roomCode, 'playerId' => $playerId]);
        }

        // Проверяем, не исключен ли игрок
        $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
        if (in_array($playerId, $eliminatedPlayers)) {
            // Игрок исключен, перенаправляем на главный экран
            return redirect('/')->with('message', 'Вы были исключены из игры');
        }

        // Получаем только активных игроков (не исключенных)
        $activePlayers = array_filter($gameData['players'], function($player) use ($eliminatedPlayers) {
            return !in_array($player['id'], $eliminatedPlayers);
        });
        $activePlayers = array_values($activePlayers);

        return Inertia::render('Games/Spy/pages/SpyVoting', [
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
        // Код комнаты теперь только цифры (3 цифры)
        $playerId = $request->input('playerId');
        $votedForId = $request->input('votedForId');
        
        $gameData = Cache::get("spy_game_{$roomCode}");
        
        if (!$gameData) {
            return response()->json(['error' => 'Игра не найдена'], 404);
        }

        // Проверяем, что игра в статусе голосования
        if ($gameData['status'] !== 'voting') {
            return response()->json(['error' => 'Голосование не началось'], 400);
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
        
        // Находим имена игроков
        $player = collect($gameData['players'])->firstWhere('id', $playerId);
        $votedForPlayer = collect($gameData['players'])->firstWhere('id', $votedForId);
        
        $playerName = $player['name'] ?? 'Игрок';
        $votedForName = $votedForPlayer['name'] ?? 'Игрок';

        // Проверяем, все ли проголосовали (только активные игроки) ПЕРЕД сохранением
        $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
        $activePlayers = array_filter($gameData['players'], function($player) use ($eliminatedPlayers) {
            return !in_array($player['id'], $eliminatedPlayers);
        });
        $allActivePlayerIds = array_column($activePlayers, 'id');
        $votedPlayers = array_keys($gameData['votes'] ?? []);
        
        // Сохраняем в кеш
        Cache::put("spy_game_{$roomCode}", $gameData, now()->addHours(2));

        // Отправляем событие о голосе
        broadcast(new SpyVoteSubmitted($roomCode, $playerId, $playerName, $votedForId, $votedForName));

        // Проверяем, все ли проголосовали
        if (count($votedPlayers) === count($allActivePlayerIds) && count($allActivePlayerIds) > 0) {
            // Перечитываем данные из кеша для финальной проверки (на случай параллельных запросов)
            $finalGameData = Cache::get("spy_game_{$roomCode}");
            if (!$finalGameData) {
                return response()->json(['success' => true]);
            }

            // Проверяем, не идет ли уже подсчет результатов (защита от race condition)
            if ($finalGameData['status'] === 'results' || isset($finalGameData['calculating_results'])) {
                return response()->json(['success' => true]);
            }

            // Проверяем еще раз, что все проголосовали
            $finalVotedPlayers = array_keys($finalGameData['votes'] ?? []);
            $finalEliminatedPlayers = $finalGameData['eliminatedPlayers'] ?? [];
            $finalActivePlayers = array_filter($finalGameData['players'], function($player) use ($finalEliminatedPlayers) {
                return !in_array($player['id'], $finalEliminatedPlayers);
            });
            $finalAllActivePlayerIds = array_column($finalActivePlayers, 'id');
            
            if (count($finalVotedPlayers) === count($finalAllActivePlayerIds) && count($finalAllActivePlayerIds) > 0) {
                // Устанавливаем флаг, что идет подсчет результатов
                $finalGameData['calculating_results'] = true;
                Cache::put("spy_game_{$roomCode}", $finalGameData, now()->addHours(2));
                
                // Все проголосовали, подсчитываем результаты
                $this->calculateResults($roomCode, $finalGameData);
            }
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
                unset($gameData['calculating_results']);
                Cache::put("spy_game_{$roomCode}", $gameData, now()->addHours(2));
                broadcast(new SpyResultsReady($roomCode, $results));
                return;
            }
            
            // При ничьей возвращаем к этапу обсуждения (не сразу к голосованию)
            $gameData['status'] = 'playing';
            $gameData['votes'] = [];
            $gameData['readyToVote'] = [];
            unset($gameData['calculating_results']);
            
            Cache::put("spy_game_{$roomCode}", $gameData, now()->addHours(2));
            broadcast(new SpyGameContinue($roomCode, array_values($activePlayers)));
            
            return;
        }
        
        // Выбывает только игрок с максимумом голосов
        if (!isset($gameData['eliminatedPlayers'])) {
            $gameData['eliminatedPlayers'] = [];
        }
        $gameData['eliminatedPlayers'][] = $mostVotedId;
        
        // Отправляем событие об исключении игрока
        broadcast(new PlayerEliminated($roomCode, $mostVotedId));
        
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
        
        // Если выбывший игрок - шпион, он должен иметь возможность угадать слово
        // Игра не заканчивается сразу, если выбыл шпион
        $isEliminatedPlayerSpy = in_array($mostVotedId, $spyIds);
        
        // Игра заканчивается сразу только если:
        // 1. Выбыл не шпион И осталось слишком мало игроков (меньше 3)
        // 2. Выбыл не шпион И все шпионы уже выбыли ранее
        if (!$isEliminatedPlayerSpy) {
            // Если выбыл не шпион, проверяем условия окончания
            if (count($activeSpyIds) === 0) {
                // Все шпионы уже выбыли ранее (не должно быть, но на всякий случай)
                $gameEnded = true;
                $gameEndReason = 'spies_eliminated';
            } elseif (count($activePlayersAfterElimination) < 3) {
                // Слишком мало игроков
                $gameEnded = true;
                $gameEndReason = 'not_enough_players';
            }
        }
        // Если выбыл шпион, игра не заканчивается сразу - он должен угадать слово
        
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
            'continueGame' => !$gameEnded || $isEliminatedPlayerSpy, // Продолжаем, если не закончилась или если выбыл шпион
        ];

        $gameData['status'] = 'results';
        $gameData['results'] = $results;
        unset($gameData['calculating_results']);
        
        Cache::put("spy_game_{$roomCode}", $gameData, now()->addHours(2));
        broadcast(new SpyResultsReady($roomCode, $results));
    }

    /**
     * Показать страницу результатов
     */
    public function showResults(Request $request, string $roomCode)
    {
        // Код комнаты теперь только цифры (3 цифры)
        $playerId = $request->query('playerId');
        
        if (!$playerId) {
            return redirect()->route('room.show', ['roomCode' => $roomCode]);
        }

        $gameData = Cache::get("spy_game_{$roomCode}");
        
        if (!$gameData || !isset($gameData['results'])) {
            return redirect()->route('spy.game', ['roomCode' => $roomCode, 'playerId' => $playerId]);
        }

        $results = $gameData['results'];
        $eliminatedPlayerId = $results['eliminatedPlayerId'] ?? null;
        $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
        
        // Проверяем, не исключен ли игрок
        // Исключение: если игрок - выбывший шпион, он может видеть результаты перед угадыванием
        if (in_array($playerId, $eliminatedPlayers) && $playerId !== $eliminatedPlayerId) {
            // Игрок исключен (но не выбывший шпион), перенаправляем на главный экран
            return redirect('/')->with('message', 'Вы были исключены из игры');
        }

        return Inertia::render('Games/Spy/pages/SpyResults', [
            'roomCode' => $roomCode,
            'playerId' => $playerId,
            'results' => $gameData['results'],
            'players' => $gameData['players'],
        ]);
    }

    /**
     * Показать страницу угадывания слова шпионом
     */
    public function showSpyGuess(Request $request, string $roomCode)
    {
        // Код комнаты теперь только цифры (3 цифры)
        $playerId = $request->query('playerId');
        
        if (!$playerId) {
            return redirect()->route('room.show', ['roomCode' => $roomCode]);
        }

        $gameData = Cache::get("spy_game_{$roomCode}");
        
        if (!$gameData || !isset($gameData['results'])) {
            return redirect()->route('spy.game', ['roomCode' => $roomCode, 'playerId' => $playerId]);
        }

        $results = $gameData['results'];
        $eliminatedPlayerId = $results['eliminatedPlayerId'] ?? null;
        $spyIds = $results['spyIds'] ?? [$results['spyId']];
        
        // Проверяем, что выбывший игрок - шпион
        if (!$eliminatedPlayerId || !in_array($eliminatedPlayerId, $spyIds)) {
            // Если не шпион, возвращаемся к игре
            return redirect()->route('spy.game', ['roomCode' => $roomCode, 'playerId' => $playerId]);
        }
        
        // Проверяем, что это выбывший шпион или активный игрок (для голосования)
        $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
        if (in_array($playerId, $eliminatedPlayers) && $playerId !== $eliminatedPlayerId) {
            // Игрок исключен (но не выбывший шпион), перенаправляем на главный экран
            return redirect('/')->with('message', 'Вы были исключены из игры');
        }

        // Получаем активных игроков (не исключенных, кроме выбывшего шпиона)
        $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
        $activePlayers = array_filter($gameData['players'], function($player) use ($eliminatedPlayers, $eliminatedPlayerId) {
            // Включаем выбывшего шпиона для угадывания
            return !in_array($player['id'], $eliminatedPlayers) || $player['id'] === $eliminatedPlayerId;
        });

        return Inertia::render('Games/Spy/pages/SpyGuess', [
            'roomCode' => $roomCode,
            'playerId' => $playerId,
            'eliminatedPlayerId' => $eliminatedPlayerId,
            'players' => array_values($activePlayers),
            'location' => $gameData['location'],
            'spyIds' => $spyIds,
        ]);
    }

    /**
     * Получить список локаций для выбора (4 случайных + 1 правильная)
     */
    public function getGuessOptions(Request $request, string $roomCode)
    {
        $playerId = $request->query('playerId');
        
        $gameData = Cache::get("spy_game_{$roomCode}");
        
        if (!$gameData) {
            return response()->json(['error' => 'Игра не найдена'], 404);
        }

        $correctLocation = $gameData['location'];
        $allLocations = $this->getLocations();
        
        // Убираем правильную локацию из списка
        $otherLocations = array_filter($allLocations, function($loc) use ($correctLocation) {
            return $loc !== $correctLocation;
        });
        
        // Выбираем 4 случайные локации
        $randomLocations = [];
        $availableLocations = array_values($otherLocations);
        
        // Перемешиваем массив
        shuffle($availableLocations);
        
        // Берем первые 4
        $randomLocations = array_slice($availableLocations, 0, 4);
        
        // Добавляем правильную локацию
        $options = array_merge($randomLocations, [$correctLocation]);
        
        // Перемешиваем еще раз, чтобы правильная локация не всегда была последней
        shuffle($options);
        
        return response()->json([
            'options' => $options,
        ]);
    }

    /**
     * Получить статус угадывания
     */
    public function getGuessStatus(Request $request, string $roomCode)
    {
        // Код комнаты теперь только цифры (3 цифры)
        $playerId = $request->query('playerId');
        
        $gameData = Cache::get("spy_game_{$roomCode}");
        
        if (!$gameData) {
            return response()->json(['error' => 'Игра не найдена'], 404);
        }

        $guessData = $gameData['spyGuess'] ?? [];
        
        return response()->json([
            'guessedWord' => $guessData['guessedWord'] ?? null,
            'votes' => $guessData['votes'] ?? [],
            'allVoted' => $guessData['allVoted'] ?? false,
            'result' => $guessData['result'] ?? null,
        ]);
    }

    /**
     * Шпион называет слово
     */
    public function submitGuess(Request $request, string $roomCode)
    {
        // Код комнаты теперь только цифры (3 цифры)
        $playerId = $request->input('playerId');
        $guessedWord = $request->input('guessedWord');
        
        $gameData = Cache::get("spy_game_{$roomCode}");
        
        if (!$gameData) {
            return response()->json(['error' => 'Игра не найдена'], 404);
        }

        $results = $gameData['results'] ?? [];
        $eliminatedPlayerId = $results['eliminatedPlayerId'] ?? null;
        
        // Проверяем, что это выбывший шпион
        if ($playerId !== $eliminatedPlayerId) {
            return response()->json(['error' => 'Только выбывший шпион может назвать слово'], 400);
        }

        if (!isset($gameData['spyGuess'])) {
            $gameData['spyGuess'] = [];
        }

        $gameData['spyGuess']['guessedWord'] = $guessedWord;
        $gameData['spyGuess']['votes'] = [];
        $gameData['spyGuess']['allVoted'] = false;
        
        Cache::put("spy_game_{$roomCode}", $gameData, now()->addHours(2));

        // Отправляем событие
        broadcast(new SpyGuessSubmitted($roomCode, $playerId, $guessedWord));

        return response()->json(['success' => true]);
    }

    /**
     * Игроки голосуют за угадывание слова
     */
    public function voteGuess(Request $request, string $roomCode)
    {
        // Код комнаты теперь только цифры (3 цифры)
        $playerId = $request->input('playerId');
        $vote = $request->input('vote'); // 'yes' или 'no'
        
        $gameData = Cache::get("spy_game_{$roomCode}");
        
        if (!$gameData) {
            return response()->json(['error' => 'Игра не найдена'], 404);
        }

        if (!isset($gameData['spyGuess']) || !isset($gameData['spyGuess']['guessedWord'])) {
            return response()->json(['error' => 'Шпион еще не назвал слово'], 400);
        }

        $results = $gameData['results'] ?? [];
        $eliminatedPlayerId = $results['eliminatedPlayerId'] ?? null;
        
        // Проверяем, не исключен ли игрок
        $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
        if (in_array($playerId, $eliminatedPlayers)) {
            // Игрок исключен, не может голосовать
            return response()->json(['error' => 'Вы были исключены из игры'], 403);
        }
        
        // Выбывший шпион не может голосовать (но это уже проверено выше)
        if ($playerId === $eliminatedPlayerId) {
            return response()->json(['error' => 'Выбывший шпион не может голосовать'], 400);
        }

        // Получаем активных игроков (не исключенных, кроме выбывшего шпиона)
        $activePlayers = array_filter($gameData['players'], function($player) use ($eliminatedPlayers, $eliminatedPlayerId) {
            return !in_array($player['id'], $eliminatedPlayers) || $player['id'] === $eliminatedPlayerId;
        });
        $activePlayerIds = array_column($activePlayers, 'id');
        
        // Убираем выбывшего шпиона из списка голосующих
        $votingPlayerIds = array_filter($activePlayerIds, function($id) use ($eliminatedPlayerId) {
            return $id !== $eliminatedPlayerId;
        });
        $votingPlayerIds = array_values($votingPlayerIds);

        if (!isset($gameData['spyGuess']['votes'])) {
            $gameData['spyGuess']['votes'] = [];
        }

        // Сохраняем голос
        $gameData['spyGuess']['votes'][$playerId] = $vote;
        
        Cache::put("spy_game_{$roomCode}", $gameData, now()->addHours(2));

        // Отправляем событие
        broadcast(new SpyGuessVoteSubmitted($roomCode, $playerId, $vote));

        // Проверяем, все ли проголосовали
        $votedPlayers = array_keys($gameData['spyGuess']['votes'] ?? []);
        
        if (count($votedPlayers) === count($votingPlayerIds) && count($votingPlayerIds) > 0) {
            // Все проголосовали, подсчитываем результаты
            $this->calculateGuessResult($roomCode, $gameData);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Подсчитать результат угадывания слова
     */
    private function calculateGuessResult(string $roomCode, array $gameData): void
    {
        $votes = $gameData['spyGuess']['votes'] ?? [];
        $guessedWord = $gameData['spyGuess']['guessedWord'] ?? '';
        $location = $gameData['location'] ?? '';
        
        // Подсчитываем голоса ДА
        $yesVotes = 0;
        $noVotes = 0;
        foreach ($votes as $vote) {
            if ($vote === 'yes') {
                $yesVotes++;
            } else {
                $noVotes++;
            }
        }
        
        // Если большинство сказало ДА, шпионы выиграли
        $spiesWin = $yesVotes > $noVotes;
        
        $result = [
            'spiesWin' => $spiesWin,
            'yesVotes' => $yesVotes,
            'noVotes' => $noVotes,
            'guessedWord' => $guessedWord,
            'location' => $location,
        ];

        $gameData['spyGuess']['result'] = $result;
        $gameData['spyGuess']['allVoted'] = true;
        
        // Если шпионы выиграли, игра заканчивается
        if ($spiesWin) {
            $gameData['status'] = 'ended';
            $gameData['gameEndReason'] = 'spies_guessed';
        } else {
            // Если шпионы не угадали, проверяем условия окончания игры
            $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
            $activePlayers = array_filter($gameData['players'], function($player) use ($eliminatedPlayers) {
                return !in_array($player['id'], $eliminatedPlayers);
            });
            
            // Проверяем, остались ли еще активные шпионы
            $spyIds = $gameData['spyIds'] ?? [$gameData['spyId']];
            $activeSpyIds = array_filter($spyIds, function($spyId) use ($eliminatedPlayers) {
                return !in_array($spyId, $eliminatedPlayers);
            });
            
            // Если все шпионы выбыли, игроки победили
            if (count($activeSpyIds) === 0) {
                $gameData['status'] = 'ended';
                $gameData['gameEndReason'] = 'spies_eliminated';
                $result['allSpiesEliminated'] = true;
            }
            // Если осталось слишком мало игроков
            elseif (count($activePlayers) < 3) {
                $gameData['status'] = 'ended';
                $gameData['gameEndReason'] = 'not_enough_players';
            }
            // Если еще есть шпионы и достаточно игроков, продолжаем игру
            else {
                $gameData['status'] = 'playing';
                $gameData['readyToVote'] = [];
                $gameData['votes'] = [];
                unset($gameData['results']);
                unset($gameData['spyGuess']);
            }
        }
        
        Cache::put("spy_game_{$roomCode}", $gameData, now()->addHours(2));
        
        // Отправляем событие о результате
        broadcast(new SpyGuessResult($roomCode, $result));
        
        // Если игра продолжается, отправляем событие о продолжении
        if ($gameData['status'] === 'playing') {
            $eliminatedPlayers = $gameData['eliminatedPlayers'] ?? [];
            $activePlayers = array_filter($gameData['players'], function($player) use ($eliminatedPlayers) {
                return !in_array($player['id'], $eliminatedPlayers);
            });
            broadcast(new SpyGameContinue($roomCode, array_values($activePlayers)));
        }
        // Если игра заканчивается, отправляем событие о завершении (для возврата в комнату)
        elseif ($gameData['status'] === 'ended') {
            // Можно добавить специальное событие о завершении игры, если нужно
            // Пока просто используем существующую логику
        }
    }
}
