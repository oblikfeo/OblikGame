<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use App\Events\PlayerJoined;
use App\Events\PlayerLeft;
use App\Events\GameStarted;

class RoomController extends Controller
{
    /**
     * Получить список игроков в комнате
     */
    public function getPlayers(Request $request, string $roomCode)
    {
        $roomCode = strtoupper($roomCode);
        $players = Cache::get("room_{$roomCode}_players", []);
        
        return response()->json(['players' => array_values($players)]);
    }

    /**
     * Добавить игрока в комнату
     */
    private function addPlayerToRoom(string $roomCode, array $player): void
    {
        $key = "room_{$roomCode}_players";
        $players = Cache::get($key, []);
        $players[$player['id']] = $player;
        // Храним 24 часа
        Cache::put($key, $players, now()->addHours(24));
    }

    /**
     * Удалить игрока из комнаты
     */
    private function removePlayerFromRoom(string $roomCode, string $playerId): void
    {
        $key = "room_{$roomCode}_players";
        $players = Cache::get($key, []);
        if (isset($players[$playerId])) {
            unset($players[$playerId]);
            Cache::put($key, $players, now()->addHours(24));
        }
    }

    /**
     * Получить всех игроков комнаты
     */
    private function getRoomPlayers(string $roomCode): array
    {
        $players = Cache::get("room_{$roomCode}_players", []);
        return array_values($players);
    }

    /**
     * Создать новую комнату
     */
    public function create(Request $request)
    {
        $roomCode = strtoupper(Str::random(6));
        $playerId = Str::uuid()->toString();
        $playerName = $request->input('playerName', 'Игрок 1');
        
        $player = [
            'id' => $playerId,
            'name' => $playerName,
            'isHost' => true,
        ];
        
        // Добавляем игрока в общее хранилище
        $this->addPlayerToRoom($roomCode, $player);
        
        // Сохраняем данные в сессии
        session([
            "room_{$roomCode}_player_{$playerId}" => $player,
            "room_{$roomCode}_host" => $playerId,
        ]);
        
        // Отправляем событие о присоединении создателя комнаты
        \Log::info('Отправка события PlayerJoined', ['roomCode' => $roomCode, 'player' => $player]);
        broadcast(new PlayerJoined($roomCode, $player));
        
        // Редирект на GET маршрут комнаты с параметрами
        return redirect()->to("/room/{$roomCode}?playerId={$playerId}&playerName=" . urlencode($playerName));
    }

    /**
     * Присоединиться к комнате
     */
    public function join(Request $request)
    {
        $roomCode = strtoupper($request->input('roomCode'));
        $playerId = Str::uuid()->toString();
        $playerName = $request->input('playerName', 'Игрок');
        
        $player = [
            'id' => $playerId,
            'name' => $playerName,
            'isHost' => false,
        ];
        
        // Добавляем игрока в общее хранилище
        $this->addPlayerToRoom($roomCode, $player);
        
        // Сохраняем данные в сессии
        session([
            "room_{$roomCode}_player_{$playerId}" => $player,
        ]);
        
        // Отправляем событие о присоединении нового игрока
        \Log::info('Отправка события PlayerJoined', ['roomCode' => $roomCode, 'player' => $player]);
        broadcast(new PlayerJoined($roomCode, $player));
        
        // Редирект на GET маршрут комнаты с параметрами
        return redirect()->to("/room/{$roomCode}?playerId={$playerId}&playerName=" . urlencode($playerName));
    }

    /**
     * Показать комнату
     */
    public function show(Request $request, string $roomCode)
    {
        $roomCode = strtoupper($roomCode);
        
        // Получаем данные из query параметров или сессии
        $playerId = $request->query('playerId') ?? session("room_{$roomCode}_last_player_id");
        $playerName = $request->query('playerName') ?? 'Игрок';
        
        // Если playerId не передан, создаем нового
        if (!$playerId) {
            $playerId = Str::uuid()->toString();
        }
        
        // Сохраняем последний playerId для этой комнаты
        session(["room_{$roomCode}_last_player_id" => $playerId]);
        
        // Получаем данные игрока из сессии
        $playerData = session("room_{$roomCode}_player_{$playerId}");
        $isHost = session("room_{$roomCode}_host") === $playerId;
        
        if (!$playerData) {
            // Если игрок не найден, создаем нового
            $playerData = [
                'id' => $playerId,
                'name' => $playerName,
                'isHost' => $isHost,
            ];
            session(["room_{$roomCode}_player_{$playerId}" => $playerData]);
        }
        
        // Получаем всех игроков из общего хранилища
        $players = $this->getRoomPlayers($roomCode);
        
        // Если текущего игрока нет в списке, добавляем его
        $currentPlayerExists = false;
        foreach ($players as $p) {
            if ($p['id'] === $playerId) {
                $currentPlayerExists = true;
                break;
            }
        }
        
        if (!$currentPlayerExists && $playerData) {
            $this->addPlayerToRoom($roomCode, $playerData);
            // Обновляем список игроков после добавления
            $players = $this->getRoomPlayers($roomCode);
            // Отправляем событие о присоединении
            \Log::info('Отправка события PlayerJoined из show', ['roomCode' => $roomCode, 'player' => $playerData]);
            broadcast(new PlayerJoined($roomCode, $playerData));
        }
        
        return Inertia::render('Room', [
            'roomCode' => $roomCode,
            'playerId' => $playerId,
            'isHost' => $isHost,
            'players' => $players,
        ]);
    }

    /**
     * Покинуть комнату
     */
    public function leave(Request $request)
    {
        $roomCode = strtoupper($request->input('roomCode'));
        $playerId = $request->input('playerId');
        
        if (!$roomCode || !$playerId) {
            return response()->json(['error' => 'Не указаны roomCode или playerId'], 400);
        }
        
        // Удаляем игрока из кеша
        $this->removePlayerFromRoom($roomCode, $playerId);
        
        // Отправляем событие о выходе игрока
        \Log::info('Отправка события PlayerLeft', ['roomCode' => $roomCode, 'playerId' => $playerId]);
        broadcast(new PlayerLeft($roomCode, $playerId));
        
        return response()->json(['success' => true]);
    }

    /**
     * Запустить игру
     */
    public function start(Request $request)
    {
        $roomCode = strtoupper($request->input('roomCode'));
        
        // Отправляем событие о начале игры
        broadcast(new GameStarted($roomCode));
        
        return response()->json(['success' => true]);
    }

    /**
     * Показать страницу выбора игр
     */
    public function showGameSelection(Request $request, string $roomCode)
    {
        $roomCode = strtoupper($roomCode);
        
        // Получаем данные из query параметров или сессии
        $playerId = $request->query('playerId') ?? session("room_{$roomCode}_last_player_id");
        
        if (!$playerId) {
            // Если playerId не передан, редиректим в комнату
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
        
        // Получаем всех игроков из общего хранилища
        $players = $this->getRoomPlayers($roomCode);
        
        // Убеждаемся, что текущий игрок есть в списке
        $playersArray = Cache::get("room_{$roomCode}_players", []);
        if (!isset($playersArray[$playerId])) {
            $playersArray[$playerId] = $playerData;
            Cache::put("room_{$roomCode}_players", $playersArray, now()->addHours(24));
            
            // Отправляем событие о присоединении
            broadcast(new PlayerJoined($roomCode, $playerData));
            
            // Обновляем список игроков
            $players = $this->getRoomPlayers($roomCode);
        }
        
        return Inertia::render('GameSelection', [
            'roomCode' => $roomCode,
            'playerId' => $playerId,
            'isHost' => $isHost,
            'players' => $players,
        ]);
    }
}
