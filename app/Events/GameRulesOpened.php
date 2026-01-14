<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GameRulesOpened implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $roomCode;
    public $gameId;

    /**
     * Create a new event instance.
     */
    public function __construct(string $roomCode, string $gameId)
    {
        $this->roomCode = $roomCode;
        $this->gameId = $gameId;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('room.' . $this->roomCode),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'game.rules.opened';
    }

    /**
     * The data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'roomCode' => $this->roomCode,
            'gameId' => $this->gameId,
        ];
    }
}
