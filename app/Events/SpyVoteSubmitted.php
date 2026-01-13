<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SpyVoteSubmitted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $roomCode;
    public $playerId;
    public $playerName;
    public $votedForId;
    public $votedForName;

    public function __construct(string $roomCode, string $playerId, string $playerName, string $votedForId, string $votedForName)
    {
        $this->roomCode = $roomCode;
        $this->playerId = $playerId;
        $this->playerName = $playerName;
        $this->votedForId = $votedForId;
        $this->votedForName = $votedForName;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('room.' . $this->roomCode),
        ];
    }

    public function broadcastAs(): string
    {
        return 'spy.vote.submitted';
    }

    public function broadcastWith(): array
    {
        return [
            'roomCode' => $this->roomCode,
            'playerId' => $this->playerId,
            'playerName' => $this->playerName,
            'votedForId' => $this->votedForId,
            'votedForName' => $this->votedForName,
        ];
    }
}
