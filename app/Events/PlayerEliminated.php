<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PlayerEliminated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $roomCode;
    public $playerId;

    public function __construct(string $roomCode, string $playerId)
    {
        $this->roomCode = $roomCode;
        $this->playerId = $playerId;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('room.' . $this->roomCode),
        ];
    }

    public function broadcastAs(): string
    {
        return 'player.eliminated';
    }

    public function broadcastWith(): array
    {
        return [
            'roomCode' => $this->roomCode,
            'playerId' => $this->playerId,
        ];
    }
}
