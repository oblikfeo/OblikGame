<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SpyGameStarted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $roomCode;
    public $gameData;

    public function __construct(string $roomCode, array $gameData)
    {
        $this->roomCode = $roomCode;
        $this->gameData = $gameData;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('room.' . $this->roomCode),
        ];
    }

    public function broadcastAs(): string
    {
        return 'spy.game.started';
    }

    public function broadcastWith(): array
    {
        return [
            'roomCode' => $this->roomCode,
            'gameData' => $this->gameData,
        ];
    }
}
