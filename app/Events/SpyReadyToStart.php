<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SpyReadyToStart implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $roomCode;
    public $playerId;
    public $readyPlayers;

    /**
     * Create a new event instance.
     */
    public function __construct(string $roomCode, string $playerId, array $readyPlayers)
    {
        $this->roomCode = $roomCode;
        $this->playerId = $playerId;
        $this->readyPlayers = $readyPlayers;
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
        return 'spy.ready.to.start';
    }

    /**
     * The data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'roomCode' => $this->roomCode,
            'playerId' => $this->playerId,
            'readyPlayers' => $this->readyPlayers,
        ];
    }
}
