<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SpyGameContinue implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $roomCode;
    public $players;

    public function __construct(string $roomCode, array $players)
    {
        $this->roomCode = $roomCode;
        $this->players = $players;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('room.' . $this->roomCode),
        ];
    }

    public function broadcastAs(): string
    {
        return 'spy.game.continue';
    }

    public function broadcastWith(): array
    {
        return [
            'roomCode' => $this->roomCode,
            'players' => $this->players,
        ];
    }
}
