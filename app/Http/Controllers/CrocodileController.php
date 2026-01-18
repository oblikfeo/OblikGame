<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use App\Events\CrocodileGameStarted;
use App\Events\CrocodileWordGenerated;

class CrocodileController extends Controller
{
    /**
     * Массив слов для игры Крокодил (обычные)
     */
    private function getWords(): array
    {
        return [
            'Кот',
            'Собака',
            'Слон',
            'Лев',
            'Тигр',
            'Медведь',
            'Заяц',
            'Волк',
            'Лиса',
            'Обезьяна',
            'Птица',
            'Рыба',
            'Дерево',
            'Цветок',
            'Солнце',
            'Луна',
            'Звезда',
            'Облако',
            'Дождь',
            'Снег',
            'Машина',
            'Самолет',
            'Корабль',
            'Велосипед',
            'Поезд',
            'Дом',
            'Школа',
            'Больница',
            'Магазин',
            'Парк',
            'Море',
            'Гора',
            'Река',
            'Озеро',
            'Лес',
            'Пляж',
            'Город',
            'Деревня',
            'Книга',
            'Телефон',
            'Компьютер',
            'Стол',
            'Стул',
            'Кровать',
            'Окно',
            'Дверь',
            'Хлеб',
            'Молоко',
            'Яблоко',
            'Банан',
            'Мяч',
            'Кукла',
            'Машинка',
            'Самолет',
            'Кораблик',
            'Пират',
            'Принцесса',
            'Рыцарь',
            'Дракон',
            'Ведьма',
            'Волшебник',
            'Супергерой',
            'Робот',
            'Инопланетянин',
            'Космос',
            'Ракета',
            'Планета',
            'Звезда',
            'Комета',
            'Спорт',
            'Футбол',
            'Баскетбол',
            'Теннис',
            'Плавание',
            'Бег',
            'Прыжок',
            'Танец',
            'Пение',
            'Музыка',
            'Гитара',
            'Пианино',
            'Барабан',
            'Скрипка',
            'Кино',
            'Театр',
            'Цирк',
            'Концерт',
            'Праздник',
            'День рождения',
            'Новый год',
            'Рождество',
            'Подарок',
            'Торт',
            'Свеча',
            'Воздушный шар',
            'Фейерверк',
        ];
    }

    /**
     * Массив слов для игры Крокодил (18+)
     */
    private function getAdultWords(): array
    {
        return [
            'Поцелуй',
            'Объятие',
            'Романтика',
            'Свидание',
            'Влюбленность',
            'Страсть',
            'Искушение',
            'Флирт',
            'Соблазн',
            'Вожделение',
            'Любовь',
            'Сексуальность',
            'Эротика',
            'Страстный поцелуй',
            'Интимность',
            'Соблазнитель',
            'Соблазнительница',
            'Романтический ужин',
            'Свидание при свечах',
            'Страстная ночь',
        ];
    }

    /**
     * Массив фраз для игры Крокодил (2 слова)
     */
    private function getPhrases(): array
    {
        return [
            'Красный мяч',
            'Большой дом',
            'Быстрая машина',
            'Высокое дерево',
            'Красивая птица',
            'Вкусное яблоко',
            'Громкая музыка',
            'Тихая ночь',
            'Яркое солнце',
            'Синее море',
            'Зеленый лес',
            'Белый снег',
            'Черная кошка',
            'Желтый банан',
            'Оранжевый апельсин',
            'Фиолетовый цветок',
            'Розовая кукла',
            'Коричневая собака',
            'Серая мышь',
            'Золотая звезда',
            'Серебряная монета',
            'Медный чайник',
            'Стеклянная ваза',
            'Деревянный стол',
            'Железный замок',
            'Пластиковая бутылка',
            'Бумажная книга',
            'Кожаная сумка',
            'Шерстяной свитер',
            'Хлопковая рубашка',
        ];
    }

    /**
     * Массив фраз для игры Крокодил (18+, 2 слова)
     */
    private function getAdultPhrases(): array
    {
        return [
            'Страстный поцелуй',
            'Романтическое свидание',
            'Интимная беседа',
            'Соблазнительный взгляд',
            'Страстная ночь',
            'Романтический ужин',
            'Свидание при свечах',
            'Страстное объятие',
            'Искушение и соблазн',
            'Влюбленная пара',
        ];
    }

    /**
     * Получить случайное слово или фразу
     */
    private function getRandomWord(array $settings): array
    {
        $wordType = $settings['wordType'] ?? 'single'; // single, phrase, all
        $adultMode = $settings['adultMode'] ?? false;

        $word = '';
        $action = ['рассказать', 'показать'][array_rand(['рассказать', 'показать'])];

        if ($wordType === 'all') {
            // Смешиваем все типы
            $allWords = $this->getWords();
            $allPhrases = $this->getPhrases();
            $allOptions = array_merge($allWords, $allPhrases);
            
            if ($adultMode) {
                $adultWords = $this->getAdultWords();
                $adultPhrases = $this->getAdultPhrases();
                $allOptions = array_merge($allOptions, $adultWords, $adultPhrases);
            }
            
            $word = $allOptions[array_rand($allOptions)];
        } elseif ($wordType === 'phrase') {
            $phrases = $this->getPhrases();
            if ($adultMode) {
                $adultPhrases = $this->getAdultPhrases();
                $phrases = array_merge($phrases, $adultPhrases);
            }
            $word = $phrases[array_rand($phrases)];
        } else {
            // single word
            $words = $this->getWords();
            if ($adultMode) {
                $adultWords = $this->getAdultWords();
                $words = array_merge($words, $adultWords);
            }
            $word = $words[array_rand($words)];
        }

        return [
            'word' => $word,
            'action' => $action,
        ];
    }

    /**
     * Показать правила игры
     */
    public function showRules(Request $request, string $roomCode)
    {
        // Проверяем, есть ли уже настройки игры
        $settings = Cache::get("crocodile_settings_{$roomCode}", null);

        return Inertia::render('Games/Crocodile/pages/CrocodileRules', [
            'roomCode' => $roomCode,
            'settings' => $settings,
        ]);
    }

    /**
     * Сохранить настройки игры
     */
    public function saveSettings(Request $request, string $roomCode)
    {
        $settings = [
            'timer' => $request->input('timer', 'unlimited'), // 60, 30, unlimited
            'wordType' => $request->input('wordType', 'single'), // single, phrase, all
            'adultMode' => $request->input('adultMode', false),
        ];

        Cache::put("crocodile_settings_{$roomCode}", $settings, now()->addHours(2));

        return response()->json([
            'success' => true,
            'settings' => $settings,
        ]);
    }

    /**
     * Начать игру (режим 1 телефон)
     */
    public function startGame(Request $request, string $roomCode)
    {
        $players = $request->input('players', []); // Массив имен игроков
        
        if (count($players) < 1) {
            return response()->json(['error' => 'Нужно минимум 1 игрок'], 400);
        }

        // Преобразуем имена в массив игроков с ID
        // Первый игрок в списке - это создатель игры (хост), он всегда первый
        // Фильтруем пустые имена и используем правильные индексы
        $playersData = [];
        $playerIndex = 0;
        foreach ($players as $name) {
            $trimmedName = trim($name);
            if ($trimmedName) { // Пропускаем пустые имена
                $playersData[] = [
                    'id' => 'player_' . $playerIndex,
                    'name' => $trimmedName,
                ];
                $playerIndex++;
            }
        }
        
        if (count($playersData) < 1) {
            return response()->json(['error' => 'Нужно минимум 1 игрок'], 400);
        }

        // Получаем настройки
        $settings = Cache::get("crocodile_settings_{$roomCode}", [
            'timer' => 'unlimited',
            'wordType' => 'single',
            'adultMode' => false,
        ]);

        // Первый игрок всегда хост (тот кто создал игру)
        // Убеждаемся, что currentPlayerIndex всегда равен 0 для первого игрока
        if (empty($playersData)) {
            return response()->json(['error' => 'Нужно минимум 1 игрок'], 400);
        }

        // Создаем данные игры
        // ВАЖНО: currentPlayerIndex должен быть 0 для первого игрока (создателя игры)
        $gameData = [
            'mode' => 'single_phone',
            'players' => $playersData,
            'currentPlayerIndex' => 0, // Всегда 0 для первого игрока при создании игры
            'currentPlayerId' => $playersData[0]['id'], // ID первого игрока
            'settings' => $settings,
            'scores' => array_fill_keys(array_column($playersData, 'id'), 0),
            'status' => 'playing',
            'startedAt' => now()->toIso8601String(),
            'currentWord' => null, // Слово будет сгенерировано после слайдера
            'currentAction' => null,
        ];

        // Логируем создание игры для отладки
        \Log::info('Crocodile: создание игры', [
            'roomCode' => $roomCode,
            'playersCount' => count($playersData),
            'players' => $playersData,
            'currentPlayerIndex' => $gameData['currentPlayerIndex'],
            'currentPlayerId' => $gameData['currentPlayerId'],
            'firstPlayer' => $playersData[0] ?? null,
        ]);

        // Сохраняем данные игры в кеш
        Cache::put("crocodile_game_{$roomCode}", $gameData, now()->addHours(2));

        // Отправляем событие о начале игры
        broadcast(new CrocodileGameStarted($roomCode, $gameData));

        return response()->json([
            'success' => true,
            'gameData' => $gameData,
        ]);
    }

    /**
     * Показать страницу передачи телефона
     */
    public function showPassPhone(Request $request, string $roomCode)
    {
        $gameData = Cache::get("crocodile_game_{$roomCode}");
        
        if (!$gameData) {
            return redirect()->route('crocodile.rules', ['roomCode' => $roomCode]);
        }

        return Inertia::render('Games/Crocodile/pages/CrocodilePassPhone', [
            'roomCode' => $roomCode,
            'gameData' => $gameData,
        ]);
    }

    /**
     * Показать страницу игры
     */
    public function showGame(Request $request, string $roomCode)
    {
        $gameData = Cache::get("crocodile_game_{$roomCode}");
        
        if (!$gameData) {
            return redirect()->route('crocodile.rules', ['roomCode' => $roomCode]);
        }

        return Inertia::render('Games/Crocodile/pages/CrocodileGame', [
            'roomCode' => $roomCode,
            'gameData' => $gameData,
        ]);
    }

    /**
     * Игрок подтверждает, что он взял телефон (режим 1 телефон)
     */
    public function confirmPlayer(Request $request, string $roomCode)
    {
        $playerName = $request->input('playerName');
        
        $gameData = Cache::get("crocodile_game_{$roomCode}");
        
        if (!$gameData) {
            return response()->json(['error' => 'Игра не найдена'], 404);
        }

        // Находим игрока по имени
        $currentPlayer = $gameData['players'][$gameData['currentPlayerIndex']] ?? null;
        
        if (!$currentPlayer || $currentPlayer['name'] !== $playerName) {
            return response()->json(['error' => 'Неверное имя игрока'], 400);
        }

        // Генерируем новое слово для этого игрока
        $wordData = $this->getRandomWord($gameData['settings']);
        $gameData['currentWord'] = $wordData['word'];
        $gameData['currentAction'] = $wordData['action'];
        $gameData['wordGeneratedAt'] = now()->toIso8601String();

        Cache::put("crocodile_game_{$roomCode}", $gameData, now()->addHours(2));

        // Отправляем событие о генерации слова
        broadcast(new CrocodileWordGenerated($roomCode, $currentPlayer['id'], $wordData['word'], $wordData['action']));

        return response()->json([
            'success' => true,
            'word' => $wordData['word'],
            'action' => $wordData['action'],
        ]);
    }

    /**
     * Игрок справился с заданием (получает балл)
     */
    public function completeTask(Request $request, string $roomCode)
    {
        $playerName = $request->input('playerName');
        $success = $request->input('success', true); // true = успех (+1 балл), false = неудача (0 баллов)
        
        $gameData = Cache::get("crocodile_game_{$roomCode}");
        
        if (!$gameData) {
            return response()->json(['error' => 'Игра не найдена'], 404);
        }

        // Проверяем, что это правильный игрок
        $currentPlayer = $gameData['players'][$gameData['currentPlayerIndex']] ?? null;
        
        if (!$currentPlayer || $currentPlayer['name'] !== $playerName) {
            return response()->json(['error' => 'Неверное имя игрока'], 400);
        }
        
        $playerId = $currentPlayer['id'];

        // Добавляем балл только если успех
        if ($success) {
            $gameData['scores'][$playerId] = ($gameData['scores'][$playerId] ?? 0) + 1;
        }
        // Если неудача, балл остается 0 (не добавляем)

        // Переходим к следующему игроку
        $currentIndex = $gameData['currentPlayerIndex'];
        $nextIndex = ($currentIndex + 1) % count($gameData['players']);
        $gameData['currentPlayerIndex'] = $nextIndex;
        $gameData['currentPlayerId'] = $gameData['players'][$nextIndex]['id'];
        $gameData['currentWord'] = null;
        $gameData['currentAction'] = null;

        Cache::put("crocodile_game_{$roomCode}", $gameData, now()->addHours(2));

        // Отправляем событие о завершении задания (переход к следующему игроку)
        // Следующий игрок должен подтвердить, что взял телефон
        broadcast(new CrocodileWordGenerated($roomCode, $gameData['currentPlayerId'], null, null, true));

        return response()->json([
            'success' => true,
            'scores' => $gameData['scores'],
            'nextPlayer' => $gameData['players'][$nextIndex],
            'gameData' => $gameData,
        ]);
    }

    /**
     * Показать страницу результата после истечения времени
     */
    public function showTimeoutResult(Request $request, string $roomCode)
    {
        $gameData = Cache::get("crocodile_game_{$roomCode}");
        
        if (!$gameData) {
            return redirect()->route('crocodile.rules', ['roomCode' => $roomCode]);
        }

        return Inertia::render('Games/Crocodile/pages/CrocodileTimeoutResult', [
            'roomCode' => $roomCode,
            'gameData' => $gameData,
        ]);
    }

    /**
     * Получить данные игры
     */
    public function getGameData(Request $request, string $roomCode)
    {
        $gameData = Cache::get("crocodile_game_{$roomCode}");
        
        if (!$gameData) {
            return response()->json(['error' => 'Игра не найдена'], 404);
        }

        // Исправляем currentPlayerIndex, если игра только что началась (нет currentWord и currentAction)
        // В этом случае currentPlayerIndex должен быть 0 для первого игрока
        if ($gameData['status'] === 'playing' && 
            empty($gameData['currentWord']) && 
            empty($gameData['currentAction']) && 
            $gameData['currentPlayerIndex'] !== 0) {
            // Это первый раунд, currentPlayerIndex должен быть 0
            \Log::warning('Crocodile: исправление currentPlayerIndex', [
                'roomCode' => $roomCode,
                'oldIndex' => $gameData['currentPlayerIndex'],
                'newIndex' => 0,
                'players' => $gameData['players'],
            ]);
            $gameData['currentPlayerIndex'] = 0;
            $gameData['currentPlayerId'] = $gameData['players'][0]['id'] ?? null;
            // Сохраняем исправленные данные обратно в кеш
            Cache::put("crocodile_game_{$roomCode}", $gameData, now()->addHours(2));
        }

        return response()->json($gameData);
    }
}
