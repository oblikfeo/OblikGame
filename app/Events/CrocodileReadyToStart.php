<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CrocodileReadyToStart implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $roomCode;
    public $playerId;
    public $readyPlayers;

    public function __construct(string $roomCode, string $playerId, array $readyPlayers)
    {
        $this->roomCode = $roomCode;
        $this->playerId = $playerId;
        $this->readyPlayers = $readyPlayers;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('room.' . $this->roomCode),
        ];
    }

    public function broadcastAs(): string
    {
        return 'crocodile.ready.to.start';
    }

    public function broadcastWith(): array
    {
        return [
            'roomCode' => $this->roomCode,
            'playerId' => $this->playerId,
            'readyPlayers' => $this->readyPlayers,
        ];
    }
}
