<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CrocodileWordGenerated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $roomCode;
    public $playerId;
    public $word;
    public $action;
    public $isNextPlayer;

    public function __construct(string $roomCode, string $playerId, ?string $word = null, ?string $action = null, bool $isNextPlayer = false)
    {
        $this->roomCode = $roomCode;
        $this->playerId = $playerId;
        $this->word = $word;
        $this->action = $action;
        $this->isNextPlayer = $isNextPlayer;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('room.' . $this->roomCode),
        ];
    }

    public function broadcastAs(): string
    {
        return 'crocodile.word.generated';
    }

    public function broadcastWith(): array
    {
        return [
            'roomCode' => $this->roomCode,
            'playerId' => $this->playerId,
            'word' => $this->word,
            'action' => $this->action,
            'isNextPlayer' => $this->isNextPlayer,
        ];
    }
}
